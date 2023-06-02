// SPDX-License-Identifier: UNLICENSED
const { expect } = require("chai");


describe("PreImageManager", function () {
    let PreImageManager;
    let preImageManager;
    let players;
    
    beforeEach(async function () {
        //instance
        PreImageManager = await ethers.getContractFactory("PreImageManager");
        players = await ethers.getSigners();
        preImageManager = await PreImageManager.deploy([players[0].address, players[1].address]);
        await preImageManager.deployed();
        console.log("PreImage deployed to:", preImageManager.address);
    });


    // it("should initialize the contract correctly", async function () {
    //     expect(await preImage.players(0)).to.equal(players[0].address);
    //     expect(await preImage.players(1)).to.equal(players[1].address);
    //     expect(await preImage.bestRound()).to.equal(-1);
    //     expect(await preImage.status()).to.equal(0);
    // }
})

