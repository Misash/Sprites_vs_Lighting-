
const player1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const player2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Desplegando contrato con el siguiente signatario:", deployer.address);

  const PaymentChannel = await ethers.getContractFactory("PaymentChannel");
  const paymentChannel = await PaymentChannel.deploy([player1, player2]); // Reemplaza player1 y player2 con las direcciones de los jugadores

  console.log("Contrato desplegado en:", paymentChannel.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });