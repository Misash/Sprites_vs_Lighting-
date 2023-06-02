// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// External interface
interface PreimageManager {
    function submitPreimage(bytes32 x) external;
    function revealedBefore(bytes32 h, uint T) external view returns (bool);
}

// Note: Initial version does NOT support concurrent conditional payments!

contract SpriteChannel {
    // Blocks for grace period
    uint constant DELTA = 10;

    // Events
    event EventInit();
    event EventUpdate(int256 r);
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
        require(playermap[msg.sender] > 0, "Unauthorized");
        _;
    }

    function assert(bool b) internal pure {
        require(b, "Assertion failed");
    }

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
    int256 bestRound = -1;
    enum Status {
        OK,
        PENDING
    }
    Status public status;
    uint256 deadline;

    // Constant (set in constructor)
    address[2] public players;
    mapping(address => uint256) playermap;
    PreimageManager pm;

    /////////////////////////////////////
    // Sprite - Application specific data
    ////////////////////////////////////

    // State channel states
    int256[2] public credits;
    uint256[2] public withdrawals;

    // Conditional payment
    // NOTE: for simplicity, only one conditional payment supported, L to R
    bytes32 public hash;
    uint256 public expiry;
    uint256 public amount;

    // Externally affected states
    uint256[2] public deposits; // Monotonic, only incremented by deposit() function
    uint256[2] public withdrawn; // Monotonic, only incremented by withdraw() function

    function sha3int(int256 r) internal pure returns (bytes32) {
        return keccak256(abi.encode(r));
    }

    constructor(PreimageManager _pm, address[2] memory _players) {
        pm = _pm;
        for (uint256 i = 0; i < 2; i++) {
            players[i] = _players[i];
            playermap[_players[i]] = i + 1;
        }
        emit EventInit();
    }

    // Increment on new deposit
    function deposit() external payable onlyplayers {
        deposits[playermap[msg.sender] - 1] += msg.value;
    }

    // Increment on withdrawal
    function withdraw() external onlyplayers {
        uint256 i = playermap[msg.sender] - 1;
        uint256 toWithdraw = withdrawals[i] - withdrawn[i];
        withdrawn[i] = withdrawals[i];
        require(payable(msg.sender).send(toWithdraw), "Withdrawal failed");
    }

    // State channel update function
    function update(
        uint256[3] calldata sig,
        int256 r,
        int256[2] calldata _credits,
        uint256[2] calldata _withdrawals,
        bytes32 _hash,
        uint256 _expiry,
        uint256 _amount
    ) external onlyplayers {
        // Only update to states with larger round number
        if (r <= bestRound) return;

        // Check the signature of the other party
        uint256 i = (3 - playermap[msg.sender]) - 1;
        bytes32 _h = keccak256(
            abi.encode(r, _credits, _withdrawals, _hash, _expiry, _amount)
        );
        uint8 V = uint8(sig[0]);
        bytes32 R = bytes32(sig[1]);
        bytes32 S = bytes32(sig[2]);

        verifySignature(players[i], _h, V, R, S);

        // Update the state
        credits[0] = _credits[0];
        credits[1] = _credits[1];
        withdrawals[0] = _withdrawals[0];
        withdrawals[1] = _withdrawals[1];
        amount = _amount;
        hash = _hash;
        expiry = _expiry;
        bestRound = r;
        emit EventUpdate(r);
    }

    // Causes a timeout for the finalize time
    function trigger() external onlyplayers {
        require(status == Status.OK, "Invalid status");
        status = Status.PENDING;
        deadline = block.number + DELTA; // Set the deadline for collecting inputs or updates
        emit EventPending(block.number, deadline);
    }

    function finalize() external {
        require(status == Status.PENDING, "Invalid status");
        require(block.number > deadline, "Deadline not reached");

        // Finalize is safe to call multiple times
        // If "trigger" occurs before a hashlock expires, finalize will need to be called again
        // Si se produce un "disparador" antes de que caduque un hashlock, será necesario volver a llamar a finalizar

        if (amount > 0 && block.number > expiry) {
            // Completes on-chain
            if (pm.revealedBefore(hash, expiry))
                withdrawals[1] += amount;
                // Cancels off-chain
            else withdrawals[0] += amount;
            amount = 0;
            hash = 0;
            expiry = 0;
        }

        // Withdraw the maximum amount of money
        withdrawals[0] += uint256(int256(deposits[0]) + credits[0]);
        withdrawals[1] += uint256(int256(deposits[1]) + credits[1]);
        credits[0] = -int256(deposits[0]);
        credits[1] = -int256(deposits[1]);
    }
}
