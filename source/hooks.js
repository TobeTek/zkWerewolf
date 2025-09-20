import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import ZkWerewolfABI from '../ZkWerewolfABI.json' with { type: 'json' };
import { ZKWEREWOLF_CONTRACT_ADDRESS } from './services.js';

export function useWallet() {
    const [wallet, setWallet] = useState(null);

    useEffect(() => {
        const loadWallet = () => {


            const privateKey = process.env.ACCOUNT_PRIVATE_KEY;
            if (!privateKey) throw new Error('Private key not found in .env');
            const provider = new ethers.JsonRpcProvider('http://localhost:8545');
            const wallet = new ethers.Wallet(privateKey, provider);
            if (!wallet.address) throw new Error('No wallet address');
            setWallet(wallet);

        };
        loadWallet();
    }, []);

    const signMessage = async (message) => {
        if (!wallet) throw new Error('Wallet not loaded');
        return await wallet.signMessage(message);
    };

    return { wallet, signMessage };
}

export function useZkWerewolfGame(gameId, providerOrSigner) {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const contract = new ethers.Contract(
        ZKWEREWOLF_CONTRACT_ADDRESS,
        ZkWerewolfABI,
        providerOrSigner,
    );

    const fetchGame = async () => {
        try {
            const [
                admin,
                userAddressesHash,
                numPlayers,
                numWerewolves,
                turnNumber,
                lastTurnTimestamp,
                active,
                userRoleCommitments,
                currentMoveCommitments,
            ] = await Promise.all([
                contract.getAdmin(gameId),
                contract.getUserAddressesHash(gameId),
                contract.getNumPlayers(gameId),
                contract.getNumWerewolves(gameId),
                contract.getTurnNumber(gameId),
                contract.getLastTurnTimestamp(gameId),
                contract.isActive(gameId),
                contract.getUserRoleCommitments(gameId),
                contract.getCurrentMoveCommitments(gameId),
            ]);
            setGame({
                admin,
                userAddressesHash,
                numPlayers: numPlayers.toNumber(),
                numWerewolves: numWerewolves.toNumber(),
                turnNumber: turnNumber.toNumber(),
                lastTurnTimestamp: lastTurnTimestamp.toNumber(),
                active,
                userRoleCommitments,
                currentMoveCommitments,
            });
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGame();
    }, [gameId, providerOrSigner]);

    const commitMove = async (moveCommitment) => {
        try {
            const tx = await contract.commitMove(gameId, moveCommitment);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    const endTurn = async (commitments, proof) => {
        try {
            const tx = await contract.endTurn(gameId, commitments, proof);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    const startNextTurn = async () => {
        try {
            const tx = await contract.startNextTurn(gameId);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        const onMoveCommitted = (gId, player, commitment) => {
            if (gId === gameId) fetchGame();
        };
        const onTurnEnded = (gId, turnNumber, commitments) => {
            if (gId === gameId) fetchGame();
        };
        const onNextTurnStarted = (gId, turnNumber) => {
            if (gId === gameId) fetchGame();
        };
        contract.on('MoveCommitted', onMoveCommitted);
        contract.on('TurnEnded', onTurnEnded);
        contract.on('NextTurnStarted', onNextTurnStarted);
        return () => {
            contract.off('MoveCommitted', onMoveCommitted);
            contract.off('TurnEnded', onTurnEnded);
            contract.off('NextTurnStarted', onNextTurnStarted);
        };
    }, [gameId, contract]);

    return {
        game,
        loading,
        error,
        commitMove,
        endTurn,
        startNextTurn,
    };
}
