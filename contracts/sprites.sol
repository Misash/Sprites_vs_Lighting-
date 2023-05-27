pragma solidity ^0.8.0;

contract PaymentChannel {
    // Blocks for grace period
    uint constant DELTA = 10;

    // Events
    event EventInit();
    event EventUpdate(int r);
    event LogBytes32(bytes32 b);
    event EventPending(uint T1, uint T2);

    // Functions
    modifier after_(uint T) {
        require(T > 0 && block.number >= T, "Invalid block number");
        _;
    }

    modifier before(uint T) {
        require(T == 0 || block.number < T, "Invalid block number");
        _;
    }

    modifier onlyplayers() {
        require(playermap[msg.sender] > 0, "Not a player");
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

    // State channel data
    int bestRound = -1;
    enum Status {
        OK,
        PENDING
    }
    Status public status;
    uint deadline;

    // Constant
    address[2] public players;
    mapping(address => uint) playermap;

    // Payment Channel

    // State channel states
    int[2] public credits;
    uint[2] public withdrawals;

    // Externally states
    uint[2] public deposits;
    uint[2] public withdrawn;

    //deprecated
    // function sha3int(int r) internal pure returns (bytes32) {
    //     return keccak256(abi.encode(r));
    // }

    constructor(address[2] memory _players) {
        for (uint i = 0; i < 2; i++) {
            players[i] = _players[i];
            playermap[_players[i]] = i + 1;
        }
        emit EventInit();
    }

    // Increment on new deposit
    function deposit() payable onlyplayers external {
        deposits[playermap[msg.sender] - 1] += msg.value;
    }

    // Increment on withdrawal
    function withdraw() onlyplayers external {
        uint i = playermap[msg.sender] - 1;
        uint toWithdraw = withdrawals[i] - withdrawn[i];
        withdrawn[i] = withdrawals[i];
        require(payable(msg.sender).send(toWithdraw), "Withdrawal failed");
    }

    // State channel update function
    function update(
        uint[3] memory sig,
        int r,
        int[2] memory _credits,
        uint[2] memory _withdrawals
    ) onlyplayers external {
        // Only update to states with larger round number
        if (r <= bestRound) return;

        // Check the signature of the other party
        uint i = (3 - playermap[msg.sender]) - 1;
        // bytes32 _h = sha3int(r, _credits, _withdrawals);
        bytes32 _h = keccak256(abi.encode(r, _credits, _withdrawals));
        bytes32 S = bytes32(sig[2]);
        uint8 V = uint8(sig[0]);
        bytes32 R = bytes32(sig[1]);
        verifySignature(players[i], _h, V, R, S);

        // Update the state
        credits[0] = _credits[0];
        credits[1] = _credits[1];
        withdrawals[0] = _withdrawals[0];
        withdrawals[1] = _withdrawals[1];
        bestRound = r;
        emit EventUpdate(r);
    }

    // Causes a timeout for the finalize time
    function trigger() onlyplayers external {
        require(status == Status.OK, "Invalid status");
        status = Status.PENDING;
        deadline = block.number + DELTA; // onchain
        emit EventPending(block.number, deadline);
    }

    function finalize() external {
        require(status == Status.PENDING, "Invalid status");
        require(block.number > deadline, "Deadline not reached");

        // Idempotent, may be called multiple times

        // Withdraw the maximum amount of money
        withdrawals[0] += uint(int(deposits[0]) + credits[0]);
        withdrawals[1] += uint(int(deposits[1]) + credits[1]);
        credits[0] = -int(deposits[0]);
        credits[1] = -int(deposits[1]);
    }
}
