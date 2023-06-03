const { ethers } = require("hardhat");
const delta = 10; // Número de bloques para que expire el hash


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
    const PM = await ethers.getContractAt("contracts/SpriteChannel.sol:PreimageManager", preimageManagerAddress);


    // Desplegar el contrato SpriteChannel
    const SpriteChannel = await ethers.getContractFactory("SpriteChannel");
    const spriteChannel = await SpriteChannel.deploy(preimageManager.address, [
        alice.address,
        bob.address,
    ]);
    await spriteChannel.deployed();


    // Hacer un depósito en el canal para ambas partes
    await spriteChannel.connect(alice).deposit({ value: ethers.utils.parseEther("10") });
    await spriteChannel.connect(bob).deposit({ value: ethers.utils.parseEther("15") });

    // Realizar múltiples transacciones entre las partes

    // await network.provider.send("evm_mine");
    //alice envia el preimage
    let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("hash"));
    let expiry = await ethers.provider.getBlockNumber() + delta; // Set a threshold 10 blocks into the future
    await PM.connect(alice).submitPreimage(hash);
    console.log("Alice envia el preimage")
    console.log("Preimage enviado:", hash);
    console.log("expiry:", expiry);

    //bob verifica el preimage
    const storedTimestamp = await PM.connect(bob).getTimestamp(hash);
    console.log("Bob verifica el preimage")
    console.log("Stored Timestamp:", storedTimestamp);

    //mostrar todo el map
    const keys = await PM.timestamp.call(Object.keys);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = await PM.timestamp.call(key);
        console.log(`Key: ${key}, Value: ${value}`);
    }



    //alice llama a update 

    // let Round = 1;
    // let credits = [0, 0];
    // let withdrawals = [0, 0];
    // let amount = ethers.utils.parseEther("2");

    // // Generar la firma válida 
    // const messageHash = ethers.utils.solidityKeccak256(
    //     ["int", "int[2]", "uint[2]", "bytes32", "uint", "uint"],
    //     [Round, credits, withdrawals, hash, expiry, amount]
    // );

    // const messageHashBytes = ethers.utils.arrayify(messageHash);
    // console.log("H:", messageHash);

    // //alice firma el mensaje con la direccion de bob para q se verifique
    // const signature = await bob.signMessage(messageHashBytes);
    // const { v, r, s } = ethers.utils.splitSignature(signature);

    // let tx = await spriteChannel.connect(alice).update(
    //     [v, r, s], // Pasar la firma válida generada
    //     Round,
    //     credits,
    //     withdrawals,
    //     hash,
    //     expiry,
    //     amount
    // );

    // // Obtén los eventos emitidos
    // let result = await tx.wait();
    // console.log("Eventos:", result.logs);


    //  Bob quiere finalizar

    // spriteChannel.trigger();

    //periodo delta 
    //alice o bob pueden finalizar sus pagos
    // for(let i = 0; i < delta; i++){
    //     await network.provider.send("evm_mine");
    //     if(i == 5){
    //         spriteChannel.connect(alice).finalize();
    //     }
    // }



    //   console.log("Depósito de cuenta 1:", (await spriteChannel.deposits(0)).toString());
    //   console.log("Depósito de cuenta 2:", (await spriteChannel.deposits(1)).toString());
    //   console.log("Retiro de cuenta 1:", (await spriteChannel.withdrawn(0)).toString());
    //   console.log("Retiro de cuenta 2:", (await spriteChannel.withdrawn(1)).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
