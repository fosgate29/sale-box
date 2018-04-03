const { bufferToHex, fromRpcSig } = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const inquirer = require('inquirer');

const isAddress = (address) => /^0x[0-9a-fA-F]{40}$/.test(address)

const padInt = (value) => {
  return web3.padLeft(web3.toHex(value).slice(2), 64);
};

const contributionHash = (address, limit, cap) => {
  return web3.sha3(address + padInt(limit) + padInt(cap), { encoding: 'hex' });
};

const contributionPayload = (admin, address, contributionLimit, currentSaleCap) => {
  const hash = contributionHash(address, contributionLimit, currentSaleCap);
  const sig = fromRpcSig(web3.eth.sign(admin, hash));

  return abi.simpleEncode('contribute(uint256,uint256,uint8,bytes32,bytes32)', contributionLimit, currentSaleCap, sig.v, sig.r, sig.s);

}

const params = [
  {
    type: 'input',
    name: 'admin',
    message: 'Admin:',
    validate: (value) => {
      const valid = isAddress(value);
      return valid || 'Please enter a valid Ethereum Wallet address';
    }
  },
  {
    type: 'input',
    name: 'contributor',
    message: 'Contributor:',
    validate: (value) => {
      const valid = isAddress(value);
      return valid || 'Please enter a valid Ethereum Wallet address';
    }
  },
  {
    type: 'input',
    name: 'contributionLimit',
    message: 'Contribution Limit:',
    validate: (value) => {
      const valid = !isNaN(parseInt(value));
      return valid || 'Please enter a valid number';
    },
  },
  {
    type: 'input',
    name: 'currentSaleCap',
    message: 'Current Sale Cap:',
    validate: (value) => {
      const valid = !isNaN(parseInt(value));
      return valid || 'Please enter a valid number';
    },
  }
];



module.exports = (callback) => {
  inquirer.prompt(params).then(ans => {
    const { admin, contributor, contributionLimit, currentSaleCap } = ans;
    const payload = contributionPayload(admin, contributor, contributionLimit, currentSaleCap);

    console.log(payload.toString('hex'));
    callback();
  }).catch(error => {
    callback(error);
  });
 
}
