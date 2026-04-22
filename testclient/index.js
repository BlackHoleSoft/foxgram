const core = require('foxgram-core');

async function test() {
    const aliceKeypair = await core.generateKeypair();
    console.log('Keypair Alice:', aliceKeypair);

    const bobKeypair = await core.generateKeypair();
    console.log('Keypair Bob:', bobKeypair);

    // from Alice to Bob
    const message = await core.createMessage({
        message: 'Hello my friend',
        senderPrivateKey: aliceKeypair.privateKey,
        senderPublicKey: aliceKeypair.pubKey,
        receiverKey: bobKeypair.pubKey
    });
    console.log('Message:', message);

    // Bob read
    const decryptedMessage = await core.unboxMessage({
        payload: message.receiverPayload,
        privateKey: bobKeypair.privateKey,
        publicKey: aliceKeypair.pubKey
    });
    console.log('Unboxed:', decryptedMessage);
}

test();

