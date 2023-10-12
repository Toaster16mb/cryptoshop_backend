require('dotenv').config();
import Web3 from 'web3';

// Подставь свой API ключ от Infura
const infuraApiKey = process.env.INFURA_API_KEY;
const infuraNetType = process.env.INFURA_NET_TYPE;
const infuraUrl = `https://${infuraNetType}.infura.io/v3/${infuraApiKey}`;

export const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

export async function getLastBlockNum() {
    return await web3.eth.getBlockNumber();
}

export const sendAllBalance = async (privkey: string, to: string): Promise<void> => {

    try {
        const gasPrice = await web3.eth.getGasPrice()
        const signer = web3.eth.accounts.privateKeyToAccount(
            privkey,
        );
        const balance = await web3.eth.getBalance(signer.address)
        web3.eth.accounts.wallet.add(signer);
        const tx = {
            from: signer.address,
            to: to,
            value: balance,
            gas: BigInt(0),
        };
        // Assigning the right amount of gas
        tx.gas = await web3.eth.estimateGas(tx);
        tx.value = tx.value - tx.gas * gasPrice
        if (tx.value <= 0) {
            return
        }

        // Sending the transaction to the network
        const receipt = await web3.eth
            .sendTransaction(tx)
            .once("transactionHash", (txhash) => {
                console.log(`Mining transaction ...`);
                console.log(`Transaction hash: ${txhash}`);
            });
        // The transaction is now on chain!
        console.log(`Mined in block ${receipt.blockNumber}`);

        console.log('Транзакция успешно отправлена. Хэш транзакции:', receipt.transactionHash);
    } catch (error) {
        console.error('Ошибка при отправке транзакции:', error);
    }
}

export const getBalance = async (address: string, fromBlock: number = 0): Promise<number> => {
    try {
        let balance = await web3.eth.getBalance(
            address,
            'latest');
        return Number(balance) / 1000000000;
    } catch (error) {
        console.error('Ошибка при получении суммы полученных ETH:', error);
        throw error;
    }
}

export const getConfirmationsCount = async (txHash: string) => {
    try {
        const web3 = new Web3('https://rinkeby.infura.io/')
        const trx = await web3.eth.getTransaction(txHash)
        const currentBlock = await web3.eth.getBlockNumber()
        return trx.blockNumber === null ? 0 : Number(currentBlock) - Number(trx.blockNumber)
    }
    catch (error) {
        console.log(error)
    }
}
