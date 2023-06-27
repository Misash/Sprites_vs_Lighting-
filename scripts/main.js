const { ethers } = require("hardhat");
const fs = require('fs');
const SpriteNetwork = require('./SpriteNetWork.js');


const GenLinkedChannels = require('./utils/GenLinkedNet.js');
const delta = require("./constants.js");

async function main() {

    // Get accounts
    let players = await ethers.getSigners();
    console.log("Generated accounts:");
    console.log(players.length);

    // Read DataSet
    // const readData = fs.readFileSync('./Datasets/network.json', 'utf8');
    const readData = fs.readFileSync('./Datasets/ScaleFree.json', 'utf8');
    const dataset = JSON.parse(readData);
    // let totalPlayers = 4;
    let totalPlayers = 50;
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
    indexRecipient = 12;
    recipient = players[indexRecipient].address;
    console.log("AnonPlayer: ", anonPlayer.address);
    console.log("GPM account: ", GPMAccount.address);

    const spriteNet = new SpriteNetwork(Global_PM, GPMAccount);

    percentage = [0.5];
    portalTimes = [];
    pathSizes = [];

    for(let i=0; i< percentage.length ; i++){
        let startTime = performance.now();

        pathSizes.push ( await performAnonTransaction(spriteNet,dataset,players,percentage[i],totalPlayers,indexRecipient) );

        let endTime = performance.now();
        let elapsedTime = endTime - startTime;
        portalTimes.push(elapsedTime);
    }

     //portal time
     console.log("\nPortal times: ")
     for (let i = 0; i < percentage.length; i++) {
         console.log(`Agents percentage: ${percentage[i]}\t pathSize: ${pathSizes[i]}\t time: ${portalTimes[i]} ms`);
     }
 

   

    // // Create SpriteNetwork and LightningNetwork
    // const spriteNet = new SpriteNetwork(Global_PM, GPMAccount);

    // // Create channels
    // for (const data of dataset) {
    //     console.log("channel: ", data);
    //     const sender = players[data.players[0]];
    //     const recipient = players[data.players[1]];
    //     await spriteNet.createChannel([sender, recipient], data.weights);
    // }

    // // Print the channels
    // spriteNet.channels.printTable();

    // //set Agents
    // spriteNet.addAgent(players[0]);
    // spriteNet.addAgent(players[1]);


    // //create channels between GPM account and agents
    // for (const agent of spriteNet.agents) {
    //     await spriteNet.createChannel(
    //         [spriteNet.GPMAccount, agent], //sender recipient
    //         ["1000", "0"],// balance
    //         spriteNet.agentChannels // channelType
    //     );
    // }

    // //Print Agent Channels
    // spriteNet.agentChannels.printTable();

    // // anonPlayer want to send crypto to recipient
    // let toSend = 1;
   

    // //get the min path from agents to recipient
    // let minPathSize = 1000000;
    // let minIndex = 0;
    // let minPath;

    // for (let i = 0; i < spriteNet.agents.length; i++) {
    //     let path = await spriteNet.findShortestPathWithCapacity(spriteNet.agents[i].address, recipient, toSend);
    //     //choose the min path to be eficient
    //     if (path.length < minPathSize) {
    //         minPathSize = path.length;
    //         minIndex = i;
    //         minPath = path;
    //     }
    // }


    // console.log("minPath: ", minPathSize);


    // //make transactions if exists a path 
    // if (minPath.length > 0)
    // {

    //     console.log("\nCreate Channel AnonPlayer -> GPM Account")
    //     //AnonPlayer create a channel with GMP account
    //     let amountToSend = toSend + toSend * 0.04; // 4% fee

    //     await spriteNet.createChannel(
    //         [anonPlayer, GPMAccount], //sender - recipient
    //         [amountToSend.toString(), "0"],// balance
    //         spriteNet.agentChannels // channelType
    //     );

    //     console.log("\n\nAnonPlayer  send crypto -> GPM Account")
    //     //AnonPlayer send crypto to GMP account
    //     let ch = spriteNet.agentChannels.get(anonPlayer.address).head.data;
    //     await ch.makeTransaction(
    //         anonPlayer.address, //sender
    //         spriteNet.GPM.address,//recipient
    //         amountToSend.toString()// amount with 4% fee
    //     );
     
    //     console.log("\n\nGPM Account send crypto -> Agent")
    //     //GMP Account send crypto to agent with the shortest path
    //     for( let ch_ of spriteNet.agentChannels.get(spriteNet.GPMAccount.address)){
    //         const recipient = await ch_.getAddressRecipient(spriteNet.GPMAccount.address);
    //         //find channel between GPM and agent
    //         if(recipient === spriteNet.agents[minIndex].address){
    //             ch = ch_;
    //             console.log("recipient: ", recipient);
    //             break;
    //         }
    //     }
    //     await ch.makeTransaction(
    //         spriteNet.GPMAccount.address, //sender
    //         spriteNet.agents[minIndex].address,//recipient
    //         amountToSend.toString()
    //     );

    //     console.log("\n\nAgent sendt crypto -> linked channels")
    //     //now the agent can make the transactions
    //     for( let i = 0; i < minPath.length; i++)
    //     {
    //         let chunk = minPath[i];
    //         //not fees
    //         await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
    //     }

    //     console.log("completed linked channel payments");


    // } else {
    //     console.log("no path");
    // }

    // Close the channel
    // await channel.close();
}


async function performAnonTransaction(spriteNet,dataset,players,percentage,totalPlayers,indexRecipient){
     // Create SpriteNetwork and LightningNetwork
    

     // Create channels
     for (const data of dataset) {
        //  console.log("channel: ", data);
         const sender = players[data.players[0]];
         const recipient = players[data.players[1]];
         await spriteNet.createChannel([sender, recipient], data.weights);
     }
 
     // Print the channels
     spriteNet.channels.printTable();
 
     //set Agents
     numAgents = 0;
     for(let i = 0; i <  Math.round(totalPlayers*percentage); i++){
        let randomInteger = Math.floor(Math.random() * totalPlayers - 1) + 1;
        while(randomInteger == indexRecipient){
            randomInteger = Math.floor(Math.random() * totalPlayers) + 1;
        }
        spriteNet.addAgent(players[randomInteger]);
        numAgents++;
        console.log("AgentIndex: ", randomInteger)
     }
     console.log("numAgents: ", numAgents);
    //  spriteNet.addAgent(players[0]);
    //  spriteNet.addAgent(players[1]);
 
 
     //create channels between GPM account and agents
     for (const agent of spriteNet.agents) {
         await spriteNet.createChannel(
             [spriteNet.GPMAccount, agent], //sender recipient
             ["10", "10"],// balance
             spriteNet.agentChannels // channelType
         );
     }
 
     //Print Agent Channels
     spriteNet.agentChannels.printTable();
 
     // anonPlayer want to send crypto to recipient
     let toSend = 0.1;
    
 
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
     if (minPath && minPath.length > 0)
     {
 
         console.log("\nCreate Channel AnonPlayer -> GPM Account")
         //AnonPlayer create a channel with GMP account
         let amountToSend = toSend + toSend * 0.04; // 4% fee
 
         await spriteNet.createChannel(
             [anonPlayer, GPMAccount], //sender - recipient
             [amountToSend.toString(), "0"],// balance
             spriteNet.agentChannels // channelType
         );
 
         console.log("\n\nAnonPlayer  send crypto -> GPM Account")
         //AnonPlayer send crypto to GMP account
         let ch = spriteNet.agentChannels.get(anonPlayer.address).head.data;
         await ch.makeTransaction(
             anonPlayer.address, //sender
             spriteNet.GPM.address,//recipient
             amountToSend.toString()// amount with 4% fee
         );
      
         console.log("\n\nGPM Account send crypto -> Agent")
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
 
         console.log("\n\nAgent sendt crypto -> linked channels")
         //now the agent can make the transactions
         for( let i = 0; i < minPath.length; i++)
         {
             let chunk = minPath[i];
             //not fees
             await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
         }
 
         console.log("completed linked channel payments");
 
 
     } else {
         console.log("no path");
         minPathSize = 0;
     }

     return minPathSize;
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
