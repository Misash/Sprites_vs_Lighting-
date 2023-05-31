// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



contract Counter {
    uint count;

    constructor() public{
        count = 0;
    }

    //view does not modified the contrast state
    //return uint
    function getCount() public view returns(uint){
        return count;
    }

    // its a void function
    function incrementCount() public{
        count = count +1;
    }
}

