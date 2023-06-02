// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract PreimageManager {
    mapping(bytes32 => uint256) timestamp;

    // block = 15 seconds
    //save the block where the preimage was revealed
    function submitPreimage(bytes32 x) external {
        if (timestamp[keccak256(abi.encode(x))] == 0) {
            timestamp[keccak256(abi.encode(x))] = block.number;

            // console.log("-------------------------");
            // console.log("X: "); console.logBytes32(x);
            // console.log("H: ");
            // console.logBytes32(keccak256(abi.encode(x)));
            // console.log("block Num: ",timestamp[keccak256(abi.encode(x))]);
            // console.log("-------------------------");
        }
    }

    function getTimestamp(bytes32 x) external view returns (uint256) {
        return timestamp[keccak256(abi.encode(x))];
    }

    //función permite a un usuario verificar si una preimagen con un hash h se reveló antes del tiempo T
    function revealedBefore(bytes32 h, uint256 T) external view returns (bool) {
        uint256 t = timestamp[keccak256(abi.encode(h))]; //block number
        return (t > 0 && t <= T);
    }
}
