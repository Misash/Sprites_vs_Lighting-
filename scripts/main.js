const { ethers } = require("hardhat");
const fs = require('fs');
const SpriteNetwork = require('./SpriteNetWork.js');
const LightningNetwork = require('./LightningNetwork.js');

const GenLinkedChannels = require('./utils/GenLinkedNet.js');
const delta = require("./constants.js");

async function main() {
    // Get accounts
    const players = await ethers.getSigners();
    console.log("Generated accounts:");
    console.log(players.length);

    // Read DataSet

    const readData = fs.readFileSync('./Datasets/LinkedNet.json', 'utf8');
    const dataset = JSON.parse(readData);
    let totalPlayers = 50;
    console.log("channels: ", dataset.length);


    // Get Global PreimageManager
    const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
    const preimageManager = await PreimageManager.deploy();
    await preimageManager.deployed();
    const preimageManagerAddress = preimageManager.address;
    const Global_PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);

    // Create SpriteNetwork and LightningNetwork
    const spriteNet = new SpriteNetwork(Global_PM);
    const lightningNet = new LightningNetwork();

    // Create channels
    let channels = [];
    for (const data of dataset) {
        console.log("channel: ", data);
        const sender = players[data.players[0]];
        const recipient = players[data.players[1]];
        channels.push(await spriteNet.createChannel([sender, recipient], data.weights));
        channels.push(await lightningNet.createChannel([sender, recipient], data.weights));
    }

    // Print the channels
    spriteNet.channels.printTable();
    lightningNet.channels.printTable();

    // Find path to make a transaction with linked Channels
    let toSend = 0.1;
    let sp_path = await spriteNet.findShortestPathWithCapacity(players[0].address, players[totalPlayers - 1].address, toSend);
    let lg_path = await lightningNet.findShortestPathWithCapacity(players[0].address, players[totalPlayers - 1].address, toSend);


    let petty_rates = [0.0,0.1,0.2,0.3,0.4,0.5];
    let spriteTimes = [];
    let lightningTimes = [];

    for (petty_rate of petty_rates) {
        // // Perform transactions on SpriteNet
        spriteTimes.push ( await performTransactions("sprites", sp_path, petty_rate) );
        // // Perform transactions on LightningNet
        lightningTimes.push ( await performTransactions("lightning", lg_path, petty_rate) );
    }

    //sprites time
    console.log("\nSpriteNet times: ")
    for (let i = 0; i < petty_rates.length; i++) {
        console.log(`Petty rate: ${petty_rates[i]}\t time: ${spriteTimes[i]} ms`);
    }

     //Lightning time
     console.log("\nLightning times: ")
     for (let i = 0; i < petty_rates.length; i++) {
         console.log(`Petty rate: ${petty_rates[i]}\t time: ${lightningTimes[i]} ms`);
     }

    


    // Close the channel
    // await channel.close();
}

async function performTransactions(net, path, petty_rate) {
    let startTime = performance.now();

    let malicious = Math.round(path.length * petty_rate);
    let no_malicious = path.length - malicious;


    if (net === "sprites") {

        // Get current information of the blockchain
        let currentBlock = await ethers.provider.getBlockNumber();
        let deadline = currentBlock + delta;
        console.log("currentBlock: ", currentBlock);
        console.log("deadline: ", deadline);

        // Make transactions
        for (let i = 0; i < no_malicious; i++) {
            const chunk = path[i];
            await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
        }

        // Petty attack and reveal preimage after delta time
        for (let i = currentBlock; i < deadline; i++) {
            if (i === deadline - 1) {
                for (let j = no_malicious; j < path.length; j++) {
                    const chunk = path[j];
                    await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
                }
            }
            await network.provider.send("evm_mine");
        }

    } else if (net === "lightning") {

        //make the transactions O(1)
        for (let i = 0; i < no_malicious; i++) {
            chunk = path[i];
            await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString(), false);
        }
        //petty attack -> delta time to reveal the preimage O(l*delta)
        for (let i = no_malicious; i < path.length; i++) {
            chunk = path[i];
            await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString(), true);
        }
    }

    let endTime = performance.now();
    let elapsedTime = endTime - startTime;

    return elapsedTime;
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
