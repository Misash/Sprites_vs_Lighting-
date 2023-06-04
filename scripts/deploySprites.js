const { ethers } = require("hardhat");
const delta = 10; // Número de bloques para que expire el hash
const HashTable = require('./HashTable.js');



class Channel {

    constructor(_addressChannel, _PM) {
        this.addressChannel = _addressChannel;
        this.PM = _PM;
    }

    //get total amount of money of the party
    getBalance(address) {
        return this.addressChannel.getBalance(address);
    }

    //get the address of the recipient
    getAddressRecipient(address) {
        return this.addressChannel.getAddressRecipient(address);
    }

    //get index of the party
    getIndex(address) {
        return this.addressChannel.getIndex(address);
    }


    //make a transaction
    async makeTransation(senderAdress, recipientAdress, coins) {
        if (this.getBalance(senderAdress) < coins) {
            throw new Error("Not enough money");
        }

        //sender send the preImage signed with the recipient address
        let Round = this.getBalance(senderAdress) + 1;
        let amount = ethers.utils.parseEther(coins.toString());
        let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret"));
        let indexSender = this.getIndex(senderAdress);
        let indexRecipient = indexSender == 0 ? 1 : 0;
        let direction = [indexSender, indexRecipient]; // sender -> recipient

        // Generate the singature
        const messageHash = ethers.utils.solidityKeccak256(
            ["uint", "bytes32", "int[2]", "uint"],
            [Round, hash, direction, amount]
        );

        //sender send the preimage with 
        let currentBlock = await PM.connect(alice).submitPreimage(messageHash);
        let deadline = currentBlock.blockNumber + delta;
        console.log("currentBlock: ", currentBlock.blockNumber);
        console.log("deadline: ", deadline);


        //recipient has delta time to reveal the preimage
        await PM.connect(recipientAdress).revealPreimage(messageHash);

        if (revealPreimage) {
            console.log("Recipient SI revelo el preimage antes del deadline");
            //actualizar el estado del channel
            await this.addressChannel.update(Round, hash, direction, amount);
        } else {
            console.log("Recipient No revelo el preimage antes del deadline!!!!");
        }

    }

    //close the channel
    async close() {
        await this.addressChannel.finalize();
    }


}


class Network {

    //channels adress -> channel
    channels = new HashTable();

    //Global PreimageManager
    GPM = null;

    //nodos
    constructor(_GPM) {
        this.GPM = _GPM;
    }


    removeNode(adressPlayer) {
        this.nodes.remove(adressPlayer);
    }

    async createChannel(player1Address, player2Address, [coins1, coins2]){

        // deploy a contract on the network
        const SpriteChannel = await ethers.getContractFactory("ConditionalChannel");
        const spriteChannel = await SpriteChannel.deploy([player1Address, player2Address]);
        await spriteChannel.deployed();

        // Make a deposit in the channel for both parties
        await spriteChannel.connect(player1Address).deposit({ value: coins1 });
        await spriteChannel.connect(player2Address).deposit({ value: coins2 });

        //create channel instance
        const channel = new Channel(spriteChannel, this.GPM);

        // add the bidirectional channel to the network
        this.channels.set(player1Address, spriteChannel);
        this.channels.set(player2Address, spriteChannel);

    }


    

}



async function main() {



    

    // Obtener las cuentas del contrato
    const players = await ethers.getSigners();
    const [alice, bob] = players;

    // Desplegar el contrato PreimageManager
    const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
    const preimageManager = await PreimageManager.deploy();
    await preimageManager.deployed();


    // Obtener una instancia existente del contrato PreimageManager
    const preimageManagerAddress = preimageManager.address; // Dirección del contrato PreimageManager existente
    const PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);


    // Desplegar el contrato SpriteChannel
    const SpriteChannel = await ethers.getContractFactory("ConditionalChannel");
    const spriteChannel = await SpriteChannel.deploy([
        alice.address,
        bob.address,
    ]);
    await spriteChannel.deployed();


    // Hacer un depósito en el canal para ambas partes
    await spriteChannel.connect(alice).deposit({ value: ethers.utils.parseEther("10") });
    await spriteChannel.connect(bob).deposit({ value: ethers.utils.parseEther("15") });



    //Realizar múltiples transacciones entre las partes

    //alice envia el preimage y firma con la direccion de bob
    let Round = 1;
    let amount = ethers.utils.parseEther("2");
    let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret"));
    let direction = [0, 1]; // alice -> bob
    // Generar la firma válida 
    const messageHash = ethers.utils.solidityKeccak256(
        ["uint", "bytes32", "int[2]", "uint"],
        [Round, hash, direction, amount]
    );



    //alice envia el preimage
    let currentBlock = await PM.connect(alice).submitPreimage(messageHash);
    let deadline = currentBlock.blockNumber + delta;
    console.log("currentBlock: ", currentBlock.blockNumber);
    console.log("deadline: ", deadline);

    //bob tiene delta tiempo para revelar el preimage

    for (let i = currentBlock.blockNumber; i < deadline; i++) {
        if (i == deadline - 1) {
            //bob revela el preimage
            await PM.connect(bob).revealPreimage(messageHash);
        }
        await network.provider.send("evm_mine");
    }

    let revealPreimage = await PM.revealedBefore(messageHash, deadline);

    if (revealPreimage) {
        console.log("Bob SI revelo el preimage antes del deadline");
        //actualizar el estado del channel
        await spriteChannel.update(Round, hash, direction, amount);
    } else {
        console.log("Bob No revelo el preimage antes del deadline!!!!");
    }

    //bob envia 5 eth a alice


    //alice finaliza el canal
    await spriteChannel.connect(alice).finalize();


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
