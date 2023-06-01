// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

// no concurrent payments
// payment channel off-chain

contract PaymentChannel {
    // Blocks for grace period to finalize the channel
    uint constant DELTA = 10;

    //Log
    event LogDebug(uint i, bytes32 _h, uint8 V, bytes32 R, bytes32 S);

    // Events
    event EventInit(); //initialice contract
    event EventUpdate(int r); //update channel
    event LogBytes32(bytes32 b); // register byte32 in the contract
    event EventPending(uint T1, uint T2); // pending state

    ///################################# MODIFIERS ######################################
    modifier after_(uint T) {
        require(T > 0 && block.number >= T, "Invalid block number");
        _;
    }
    modifier before(uint T) {
        require(T == 0 || block.number < T, "Invalid block number");
        _;
    }
    modifier onlyplayers() {
        require(playermap[msg.sender] > 0, "Unauthorized player");
        _;
    }

    // function assert(bool b) internal pure {
    //     require(b, "Assertion failed");
    // }

    function max(uint a, uint b) internal pure returns (uint) {
        return a > b ? a : b;
    }

    function min(uint a, uint b) internal pure returns (uint) {
        return a < b ? a : b;
    }

    function verifySignature(
        address pub,
        bytes32 h,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure {
        require(pub == ecrecover(h, v, r, s), "Invalid signature");
    }

    ///################################# END MODIFIERS ######################################

    ///////////////////////////////
    // State channel data
    ///////////////////////////////
    int public bestRound = -1;
    enum Status {
        OK,
        PENDING
    }
    Status public status;
    uint deadline;

    // Constant (set in constructor)
    address[2] public players;
    mapping(address => uint) playermap;

    /////////////////////////////////////
    // Payment Channel - Application specific data
    ////////////////////////////////////

    // State channel states
    int[2] public credits;
    uint[2] public withdrawals;

    // Externally affected states
    uint[2] public deposits; // Monotonic, only incremented by deposit() function
    uint[2] public withdrawn; // Monotonic, only incremented by withdraw() function

    constructor(address[2] memory _players) {
        for (uint i = 0; i < 2; i++) {
            players[i] = _players[i];
            playermap[_players[i]] = i + 1; // address -> id [1...]
        }
        emit EventInit();
    }

    function sha3int(int r) public pure returns (bytes32) {
        return keccak256(abi.encode(r)); //int to byte -> hash
    }

    // Increment on new deposit -> payable = recieve eth
    function deposit() public payable onlyplayers {
        // console.log("msg-deposit: ", msg);
        // console.log("msg-deposit: ", msg);
        deposits[playermap[msg.sender] - 1] += msg.value;

        //increment credit
        // credits[playermap[msg.sender] - 1] += msg.value;
        withdrawals[playermap[msg.sender] - 1] += msg.value;
    }

    // Increment on withdrawal
    function withdraw() public onlyplayers {
        uint i = playermap[msg.sender] - 1;
        uint toWithdraw = withdrawals[i] - withdrawn[i];
        withdrawn[i] = withdrawals[i];
        require(payable(msg.sender).send(toWithdraw), "Withdrawal failed");
    }

    // State channel update function
    function update(
        uint[3] memory sig,
        int currentRound,
        int[2] memory _credits,
        uint[2] memory _withdrawals
    ) public onlyplayers {
        // Only update to states with larger round number
        if (currentRound <= bestRound) return;

        // Check the signature of the other party
        uint i = (3 - playermap[msg.sender]) - 1;
        bytes32 _h = keccak256(
            abi.encode(currentRound, _credits, _withdrawals)
        );
        uint8 V = uint8(sig[0]);
        bytes32 R = bytes32(sig[1]);
        bytes32 S = bytes32(sig[2]);

        console.log("i: ",i);
        console.log("h: ");
        console.logBytes32(_h);

        // verifySignature(players[i], _h, V, R, S);

        // // Update the state
        // credits[0] = _credits[0];
        // credits[1] = _credits[1];
        // withdrawals[0] = _withdrawals[0];
        // withdrawals[1] = _withdrawals[1];
        // bestRound = currentRound;
        // emit EventUpdate(currentRound);
    }

    // Causes a timeout for the finalize time
    function trigger() public onlyplayers {
        assert(status == Status.OK);
        status = Status.PENDING;
        deadline = block.number + DELTA; // Set the deadline for collecting inputs or updates
        emit EventPending(block.number, deadline);
    }

    function finalize() public {
        require(status == Status.PENDING, "Invalid status");
        require(block.number > deadline, "Deadline not reached");

        // Note: Is idempotent, may be called multiple times

        // Withdraw the maximum amount of money
        withdrawals[0] += uint(int(deposits[0]) + credits[0]);
        withdrawals[1] += uint(int(deposits[1]) + credits[1]);
        credits[0] = -int(deposits[0]);
        credits[1] = -int(deposits[1]);
    }
}
