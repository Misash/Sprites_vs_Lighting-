const { ethers } = require("hardhat");
const fs = require('fs');
const SpriteNetwork = require('./SpriteNetWork.js');
const LightningNetwork = require('./LightningNetwork.js');

const GenLinkedChannels = require('./utils/GenLinkedNet.js');
const delta = require("./constants.js");

async function main() {

    // Get accounts
    let players = await ethers.getSigners();
    console.log("Generated accounts:");
    console.log(players.length);

    // Read DataSet
    const readData = fs.readFileSync('./Datasets/network.json', 'utf8');
    const dataset = JSON.parse(readData);
    let totalPlayers = 4;
    console.log("channels: ", dataset);
    console.log("channels Size: ", dataset.length);

    // Get Global PreimageManager
    const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
    const preimageManager = await PreimageManager.deploy();
    await preimageManager.deployed();
    const preimageManagerAddress = preimageManager.address;
    const Global_PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);

    //redistribuite accounts
    GPMAccount = players[0];// create GPM account
    anonPlayer = players[totalPlayers + 2];// create GPM account
    players = players.slice(1, totalPlayers + 1);



    // Create SpriteNetwork and LightningNetwork
    const spriteNet = new SpriteNetwork(Global_PM, GPMAccount);

    // Create channels
    for (const data of dataset) {
        console.log("channel: ", data);
        const sender = players[data.players[0]];
        const recipient = players[data.players[1]];
        await spriteNet.createChannel([sender, recipient], data.weights);
    }

    // Print the channels
    spriteNet.channels.printTable();

    //set Agents
    spriteNet.addAgent(players[0]);
    spriteNet.addAgent(players[1]);


    //create channels between GPM account and agents
    for (const agent of spriteNet.agents) {
        await spriteNet.createChannel(
            [spriteNet.GPMAccount, agent], //sender recipient
            ["1000", "0"],// balance
            spriteNet.agentChannels // channelType
        );
    }

    //Print Agent Channels
    spriteNet.agentChannels.printTable();

    // anonPlayer want to send crypto to recipient
    let toSend = 1;
    let recipient = players[3].address;

    //get the min path from agents to recipient
    let minPathSize = 1000000;
    let minIndex = 0;
    let minPath;

    for (let i = 0; i < spriteNet.agents.length; i++) {
        let path = await spriteNet.findShortestPathWithCapacity(spriteNet.agents[i].address, recipient, toSend);
        //choose the min path to be eficient
        if (path.length < minPathSize) {
            minPathSize = path.length;
            minIndex = i;
            minPath = path;
        }
    }


    console.log("minPath: ", minPathSize);


    //make transactions if exists a path 
    if (minPath.length > 0)
    {

        //AnonPlayer create a channel with GMP account
        let amountToSend = toSend + toSend * 0.04; // 4% fee

        await spriteNet.createChannel(
            [anonPlayer, GPMAccount], //sender - recipient
            [amountToSend.toString(), "0"],// balance
            spriteNet.agentChannels // channelType
        );

        //AnonPlayer send crypto to GMP account
        let ch = spriteNet.agentChannels.get(anonPlayer.address).head.data;
        await ch.makeTransaction(
            anonPlayer.address, //sender
            spriteNet.GPM.address,//recipient
            amountToSend.toString()// amount with 4% fee
        );
     

        //GMP Account send crypto to agent with the shortest path
        for( let ch_ of spriteNet.agentChannels.get(spriteNet.GPMAccount.address)){
            const recipient = await ch_.getAddressRecipient(spriteNet.GPMAccount.address);
            //find channel between GPM and agent
            if(recipient === spriteNet.agents[minIndex].address){
                ch = ch_;
                console.log("recipient: ", recipient);
                break;
            }
        }
        await ch.makeTransaction(
            spriteNet.GPMAccount.address, //sender
            spriteNet.agents[minIndex].address,//recipient
            amountToSend.toString()
        );


        //now the agent can make the transactions
        for( let i = 0; i < minPath.length; i++)
        {
            let chunk = minPath[i];
            await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
        }

        console.log("completed");


    } else {
        console.log("no path");
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
