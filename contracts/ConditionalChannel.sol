// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

// External interface

interface PreimageManager {
    function submitPreimage(bytes32 x) external returns (uint256);

    function revealPreimage(bytes32 x) external returns (uint256);

    function revealedBefore(bytes32 h, uint256 T) external view returns (bool);
}

contract ConditionalChannel {
    // Events
    event EventInit();
    event EventUpdate(uint256 r);
    event LogBytes32(bytes32 b);
    event EventPending(uint256 T1, uint256 T2);

    // Utility functions
    modifier after_(uint256 T) {
        require(T > 0 && block.number >= T, "Invalid block number");
        _;
    }
    modifier before(uint256 T) {
        require(T == 0 || block.number < T, "Invalid block number");
        _;
    }
    modifier onlyplayers() {
        require(playermap[msg.sender].id > 0, "Unauthorized player");
        _;
    }

    // function assert(bool b) internal pure {
    //     require(b, "Assertion failed");
    // }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function verifySignature(
        address pub,
        bytes32 h,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure {
        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", h)
        );
        address recoveredAddress = ecrecover(messageHash, v, r, s);
        require(recoveredAddress == pub, "Invalid signature");
    }

    ///////////////////////////////
    // State channel data
    ///////////////////////////////

    struct Player {
        uint256 id;
        uint256 credit;
    }

    struct CheckPoint {
        uint256 round;
        bytes32 hash;
        uint256[2] credits;
        uint256 blockNum;
    }

    enum Status {
        OK,
        DEPOSIT_PENDING,
        WITHDRAW_PENDING
    }

    uint256 bestRound = 0;
    Status public status;
    address[2] public players;
    mapping(address => Player) playermap;
    mapping(uint256 => CheckPoint) checkPoints;

    function sha3int(int256 r) internal pure returns (bytes32) {
        return keccak256(abi.encode(r));
    }

    constructor(address[2] memory _players) {
        for (uint256 i = 0; i < 2; i++) {
            players[i] = _players[i];
            playermap[_players[i]] = Player(i + 1, 0);
        }
        emit EventInit();
    }

    //getBalance
    function getBalance(address player) public view returns (uint256) {
        return playermap[player].credit;
    }

    //getAdress from the other party
    function getAddressRecipient(address player) public view returns (address) {
        uint256 recipientId = playermap[player].id == 1 ? 2 : 1;
        return players[recipientId - 1];
    }

    function getIndex(address player) public view returns (uint256) {
        return playermap[player].id - 1;
    }

    function getRound() public view returns (uint256) {
        return bestRound;
    }

    // Increment on new deposit
    function deposit() external payable onlyplayers {
        playermap[msg.sender].credit += msg.value;
        console.log("deposit: ", msg.value);
    }

    // Increment on withdrawal
    function withdraw(uint256 toWithdraw) external onlyplayers {
        require(
            playermap[msg.sender].credit >= toWithdraw,
            "Insufficient funds"
        );
        playermap[msg.sender].credit -= toWithdraw;
        require(payable(msg.sender).send(toWithdraw), "Withdrawal failed");
    }

    // State channel update function
    function update(
        uint256 r,
        bytes32 _hash,
        uint256[2] calldata direction,
        uint256 amount
    ) external onlyplayers {
        // Only update to states with larger round number
        if (r <= bestRound) return;

        //update checkpoint
        //alice
        // uint256 aliceCredit = playermap[players[direction[0]]].credit - amount;
        // uint256 bobCredit = playermap[players[direction[1]]].credit + amount;

        playermap[players[direction[0]]].credit -= amount;
        playermap[players[direction[1]]].credit += amount;

        uint256 senderCredit = playermap[players[direction[0]]].credit;
        uint256 recipientCredit = playermap[players[direction[1]]].credit;

        checkPoints[r] = CheckPoint({
            round: uint256(r),
            hash: _hash,
            credits: [senderCredit, recipientCredit],
            blockNum: block.number
        });


        console.log("checkpoint: ", r);
        console.log(playermap[players[0]].credit);
        console.log(playermap[players[1]].credit);

        status = Status.OK;
        emit EventUpdate(r);
    }

    function finalize() external {
        require(status == Status.OK, "Invalid status");
        //on-chain
        for (uint256 i = 0; i < 2; i++) {
            require(playermap[players[i]].credit > 0, "Insufficient funds");
            require(
                payable(players[i]).send(playermap[players[i]].credit),
                "Withdrawal failed"
            );
            console.log("withdrawal: ", playermap[players[i]].credit);
            playermap[players[i]].credit = 0;
        }
    }
}
