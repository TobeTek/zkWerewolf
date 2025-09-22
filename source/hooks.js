import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import ZkWerewolfABI from '../forgeDeployment.json' with { type: 'json' };
import { get25519KeyPair, getZkWerewolfContractAddress, logAction, } from './services.js';

export function useWallet() {
    const [wallet, setWallet] = useState(null);
    useEffect(() => {
        const loadWallet = () => {
            const privateKey = process.env.ACCOUNT_PRIVATE_KEY;
            if (!privateKey) throw new Error('Private key not found in .env');
            // const provider = new ethers.JsonRpcProvider();
            const wallet = new ethers.Wallet(privateKey);
            if (!wallet.address) throw new Error('No wallet address');
            setWallet(wallet);
        };
        loadWallet();
    }, []);
    const signMessage = async (message) => {
        if (!wallet) throw new Error('Wallet not loaded');
        return await wallet.signMessage(message);
    };

    const getEncryptKeyPair = () => {
        if (!wallet) throw new Error('Wallet not loaded');
        return get25519KeyPair(wallet.privateKey)
    }
    return { wallet, signMessage, getEncryptKeyPair };
}

export function useZkWerewolfGame(gameId, providerOrSigner) {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const contractInstance = new ethers.Contract(
        getZkWerewolfContractAddress(),
        ZkWerewolfABI,
        providerOrSigner,
    );

    const fetchGame = async () => {
        try {
            setLoading(true);
            const [
                admin,
                adminPubKey,
                userAddressesHash,
                numPlayers,
                numWerewolves,
                turnNumber,
                lastTurnTimestamp,
                active,
                gameOver,
                voteActive,
                villagersAlive,
                werewolvesDiscovered,
                userRoleCommitments,
                currentMoveCommitments,
            ] = await Promise.all([
                contractInstance.games(gameId).then(g => g.admin),
                contractInstance.games(gameId).then(g => g.adminPublicKey),
                contractInstance.getUserAddressesHash(gameId),
                contractInstance.getNumPlayers(gameId),
                contractInstance.getNumWerewolves(gameId),
                contractInstance.games(gameId).then(g => g.turnNumber.toNumber()),
                contractInstance.games(gameId).then(g => g.lastTurnTimestamp.toNumber()),
                contractInstance.games(gameId).then(g => g.active),
                contractInstance.games(gameId).then(g => g.gameOver),
                contractInstance.games(gameId).then(g => g.voteActive),
                contractInstance.games(gameId).then(g => g.villagersAlive.toNumber()),
                contractInstance.games(gameId).then(g => g.werewolvesDiscovered.toNumber()),
                contractInstance.getUserRoleCommitments(gameId),
                contractInstance.getCurrentMoveCommitments(gameId),
            ]);
            setGame({
                id: gameId,
                admin,
                adminPubKey,
                userAddressesHash,
                numPlayers: numPlayers.toNumber(),
                numWerewolves: numWerewolves.toNumber(),
                turnNumber,
                lastTurnTimestamp,
                active,
                gameOver,
                voteActive,
                villagersAlive,
                werewolvesDiscovered,
                userRoleCommitments,
                currentMoveCommitments,
                state: active ? 'Your turn' : 'Game over',
                role: 'Villager', // Placeholder, replace with actual role logic
                playersAlive: villagersAlive,
                playersDead: numPlayers.toNumber() - villagersAlive,
                players: await contractInstance.games(gameId).then(g => g.players),
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
            logAction({ action: 'commitMove', gameId, moveCommitment });
            const tx = await contractInstance.commitMove(gameId, moveCommitment);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    const endTurn = async (commitments) => {
        try {
            logAction({ action: 'endTurn', gameId, commitments });
            const tx = await contractInstance.endTurn(gameId, commitments);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    const startNextTurn = async () => {
        try {
            logAction({ action: 'startNextTurn', gameId });
            const tx = await contractInstance.startNextTurn(gameId);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    const startVote = async () => {
        try {
            logAction({ action: 'startVote', gameId });
            const tx = await contractInstance.startVote(gameId);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    const castVote = async (target) => {
        try {
            logAction({ action: 'castVote', gameId, target });
            const tx = await contractInstance.castVote(gameId, target);
            await tx.wait();
            await fetchGame();
        } catch (err) {
            setError(err.message);
        }
    };

    const endVote = async () => {
        try {
            logAction({ action: 'endVote', gameId });
            const tx = await contractInstance.endVote(gameId);
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
        const onVoteStarted = (gId, initiator) => {
            if (gId === gameId) fetchGame();
        };
        const onVoteCast = (gId, voter, target) => {
            if (gId === gameId) fetchGame();
        };
        const onVoteEnded = (gId) => {
            if (gId === gameId) fetchGame();
        };
        contractInstance.on('MoveCommitted', onMoveCommitted);
        contractInstance.on('TurnEnded', onTurnEnded);
        contractInstance.on('NextTurnStarted', onNextTurnStarted);
        contractInstance.on('VoteStarted', onVoteStarted);
        contractInstance.on('VoteCast', onVoteCast);
        contractInstance.on('VoteEnded', onVoteEnded);
        return () => {
            contractInstance.off('MoveCommitted', onMoveCommitted);
            contractInstance.off('TurnEnded', onTurnEnded);
            contractInstance.off('NextTurnStarted', onNextTurnStarted);
            contractInstance.off('VoteStarted', onVoteStarted);
            contractInstance.off('VoteCast', onVoteCast);
            contractInstance.off('VoteEnded', onVoteEnded);
        };
    }, [gameId, contractInstance]);

    return {
        game,
        loading,
        error,
        commitMove,
        endTurn,
        startNextTurn,
        startVote,
        castVote,
        endVote,
    };
}
