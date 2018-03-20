import expectThrow from './helpers/expectThrow';
import { bufferToHex, fromRpcSig } from 'ethereumjs-util';

const Whitelistable = artifacts.require('Whitelistable.sol');

const padInt = (value) => {
  return web3.padLeft(web3.toHex(value).slice(2), 64);
};

const contributionHash = (address, limit, cap) => {
  return web3.sha3(address + padInt(limit) + padInt(cap), { encoding: 'hex' });
};

contract('Whitelistable', (accounts) => {

  let whitelistable;
  const admin = accounts[0];
  const nonAdmin = accounts[1];
  const user = accounts[2];
  const zeroAddress = web3.toHex(0);


  beforeEach(async () => {
    whitelistable = await Whitelistable.new(admin);
  });

  it('should set the admin in the constructor', async () => {
    const _admin = await whitelistable.whitelistAdmin.call();
    assert.equal(_admin, admin, 'Admin is wrong');
  });

  it('should not be possible for other user to change the admin',  async () => {
    await expectThrow(whitelistable.changeAdmin(user, { from: user }));
  });

  it('should be possible for the admin to change the admin',  async () => {
    await whitelistable.changeAdmin(user, { from: admin });

    let newAdmin = await whitelistable.whitelistAdmin.call();
    assert.equal(newAdmin, user, 'Ownership wasn\'t transfered');

    //transfer ownership back to initial owner
    await whitelistable.changeAdmin(admin, { from: user });

    newAdmin = await whitelistable.whitelistAdmin.call();
    assert.equal(newAdmin, admin, 'Ownership isnt back to initial admin');
  });

  it('should not be possible to change the admin to the zero address', async () => {
    await expectThrow(whitelistable.changeAdmin(zeroAddress, { from: admin }));
  });

  it('should not return true in the checkWhitelisted function if the signature is wrong', async () => {
    const contributionLimit = web3.toWei(5);
    const currentSaleCap = web3.toWei(10);
    const hash = contributionHash(user, contributionLimit, currentSaleCap);
    const sig = fromRpcSig(web3.eth.sign(nonAdmin, hash));

    const whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);
  });

  it('should return true in the checkWhitelisted function if the signature is OK and the contributor isnt blacklisted', async () => {
    const contributionLimit = web3.toWei(5);
    const currentSaleCap = web3.toWei(10);
    const hash = contributionHash(user, contributionLimit, currentSaleCap);
    const sig = fromRpcSig(web3.eth.sign(admin, hash));

    const whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isTrue(whitelisted);
  });
  
  it('should return false in the checkWhitelisted function if the signature is OK but the contributor is blacklisted', async () => {
    const contributionLimit = web3.toWei(5);
    const currentSaleCap = web3.toWei(10);
    const hash = contributionHash(user, contributionLimit, currentSaleCap);
    const sig = fromRpcSig(web3.eth.sign(admin, hash));

    await whitelistable.addToBlacklist(user, { from: admin });

    const whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);
  }); 

  it('should return true in the checkWhitelisted function if the contributor is removed from the blacklist', async () => {
    const contributionLimit = web3.toWei(5);
    const currentSaleCap = web3.toWei(10);
    const hash = contributionHash(user, contributionLimit, currentSaleCap);
    const sig = fromRpcSig(web3.eth.sign(admin, hash));

    await whitelistable.addToBlacklist(user, { from: admin });
    await whitelistable.removeFromBlacklist(user, { from: admin });

    const whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isTrue(whitelisted);
  }); 

  it('should not be possible to accept ether (fallback function)', async () => {
    await expectThrow(whitelistable.sendTransaction({ from: admin, value: 1 }));
  });

  it('should not return true in the checkWhitelisted function if one parameter is wrong', async () => {
    const contributionLimit = web3.toWei(5);
    const currentSaleCap = web3.toWei(10);
    const hash = contributionHash(user, contributionLimit, currentSaleCap);
    const sig = fromRpcSig(web3.eth.sign(nonAdmin, hash));

    //wrong contribution limit
    let whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      2, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

    //wrong currentSaleCap
    whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      10,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

    //wrong contributor address
    whitelisted = await whitelistable.checkWhitelisted.call(
      nonAdmin,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

    //wrong signature v
    whitelisted = await whitelistable.checkWhitelisted.call(
      nonAdmin,
      contributionLimit, 
      currentSaleCap,
      1,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

    //wrong signature r
    whitelisted = await whitelistable.checkWhitelisted.call(
      nonAdmin,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(3),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

    //wrong signature s
    whitelisted = await whitelistable.checkWhitelisted.call(
      nonAdmin,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(4)
    );
    assert.isFalse(whitelisted);

    //empty contributor address
    whitelisted = await whitelistable.checkWhitelisted.call(
      '',
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

    //shifted sig.r and sig.s
    whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.s),
      bufferToHex(sig.r)
    );
    assert.isFalse(whitelisted);

    //shifted sig.r is equalt to sig.s
    whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.r)
    );
    assert.isFalse(whitelisted);

    //shifted sig.s is equalt to sig.r
    whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      contributionLimit, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.s),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

    //contribution limit is zero
    whitelisted = await whitelistable.checkWhitelisted.call(
      user,
      0, 
      currentSaleCap,
      sig.v,
      bufferToHex(sig.r),
      bufferToHex(sig.s)
    );
    assert.isFalse(whitelisted);

  });
});
