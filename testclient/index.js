const core = require('foxgram-core');

async function test() {
    const aliceKeypair = await core.generateKeypair();
    console.log('Keypair Alice:', aliceKeypair);

    const aliceName = await core.createMessage({
        message: 'Alice',
        senderPrivateKey: aliceKeypair.privateKey,
        senderPublicKey: aliceKeypair.pubKey,
        receiverKey: aliceKeypair.pubKey
    });
    const aliceSign = `${aliceName.receiverPayload}:${aliceKeypair.pubKey}`

    console.log('Alice signature:', aliceSign);

    const bobKeypair = await core.generateKeypair();
    console.log('Keypair Bob:', bobKeypair);

    const bobName = await core.createMessage({
        message: 'Bob',
        senderPrivateKey: bobKeypair.privateKey,
        senderPublicKey: bobKeypair.pubKey,
        receiverKey: bobKeypair.pubKey
    });
    const bobSign = `${bobName.receiverPayload}:${bobKeypair.pubKey}`;

    console.log('Bob signature:', bobSign);

    // --- Sender side

    // from Alice to Bob
    const message = await core.createMessage({
        message: JSON.stringify({ sign: aliceSign, username: 'Alice', message: 'Hello, Bob' }),
        senderPrivateKey: aliceKeypair.privateKey,
        senderPublicKey: aliceKeypair.pubKey,
        receiverKey: bobKeypair.pubKey
    });
    console.log('Message:', message);

    const pocket = {
        sign: aliceSign,
        message
    };

    // --- Receiver side

    const receivedAlicePubKey = pocket.sign.split(':')[1];
    const receivedAliceSignName = pocket.sign.split(':')[0];

    // Bob read
    const decryptedMessage = await core.unboxMessage({
        payload: pocket.message.receiverPayload,
        privateKey: bobKeypair.privateKey,
        publicKey: receivedAlicePubKey
    });
    console.log('Unboxed:', decryptedMessage);

    const bobTrustedUsers = [
        aliceSign
    ];    

    const parsedMessage = JSON.parse(decryptedMessage);

    if (parsedMessage.sign !== pocket.sign) {
        console.log('Invalid user signature:', decryptedName);
        return;
    }

    if (!bobTrustedUsers.includes(parsedMessage.sign)) {
        console.log(`User ${parsedMessage.sign} with name "${parsedMessage.username}" wants to send you a message. Do you trust him?`);
        return;
    }    

    console.log('Bob receive message from', parsedMessage.username, ':', parsedMessage.message);
}

test();

