const { ethers } = require("hardhat");

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
    



    await spriteChannel.connect(account1).update(
        [0, 0, 0], // Firmas
        1, // r
        [0, 0], // Créditos
        [0, 0], // Retiros
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("hash")), // hash
        0, // expiry
        ethers.utils.parseEther("0.5") // amount
    );


    //   await spriteChannel.connect(account2).update(
    //     [0, 0, 0], // Firmas
    //     2, // r
    //     [0, 0], // Créditos
    //     [0, 0], // Retiros
    //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes("hash")), // hash
    //     0, // expiry
    //     ethers.utils.parseEther("0.3") // amount
    //   );

    //   // Retirar fondos del canal
    //   await spriteChannel.connect(account1).withdraw();
    //   await spriteChannel.connect(account2).withdraw();

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
