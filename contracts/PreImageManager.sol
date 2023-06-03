// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract PreimageManager {

    struct Data {
        bool revealed;
        uint256 submit_time;
        uint256 revealed_time;
    }

    mapping(bytes32 => Data) public preimage;

    // block = 15 seconds
    //save the block where the preim0age was revealed
    function submitPreimage(bytes32 x) external returns (uint256){
        require(
            preimage[keccak256(abi.encode(x))].revealed == false,
            "Preimage already submiteed"
        );

        preimage[keccak256(abi.encode(x))] = Data({
            revealed: false,
            submit_time: block.number,
            revealed_time: 0
        });
        
        console.log("Preimage submitted at block: %s", preimage[keccak256(abi.encode(x))].submit_time);
        return preimage[keccak256(abi.encode(x))].submit_time;
    }

    function revealPreimage(bytes32 x) external returns (uint256) {
        require(
            preimage[keccak256(abi.encode(x))].revealed == false,
            "Preimage already revealed"
        );

        preimage[keccak256(abi.encode(x))].revealed = true;
        preimage[keccak256(abi.encode(x))].revealed_time = block.number;

        //return revealed time
        console.log("Preimage revealed at block: %s", preimage[keccak256(abi.encode(x))].revealed_time);
        return preimage[keccak256(abi.encode(x))].revealed_time;
    }

    // revealed before T
    function revealedBefore(bytes32 h, uint256 T) external view returns (bool) {
        uint256 t = preimage[keccak256(abi.encode(h))].revealed_time; //block number
        return (t > 0 && t <= T);
    }
}
