Myntcore
=======

This is Under's fork of Bitpay's Bitcore that uses Myntoin 2.1.1 It has a limited segwit support.

It is HIGHLY recommended to use https://github.com/silence48/myntcore-deb to build and deploy packages for production use.

----
Getting Started
=====================================
Deploying Myntore full-stack manually:
----
````
sudo apt-get update
sudo apt-get -y install curl git python3 make build-essential libzmq3-dev python2.7
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

#restart your shell/os

nvm install 10.5.0
nvm use 10.5.0

#install mongodb
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable mongod.service

#install myntcore
sudo ln -s /usr/bin/python2.7 /usr/bin/python
git clone https://github.com/silence48/myntcore.git
cd myntcore && git checkout lightweight
npm install -g --production
````
Copy the following into a file named myntcore-node.json and place it in ~/.myntcore/ (be sure to customize username values(without angle brackets<>) and/or ports)
````json
{
  "network": "livenet",
  "port": 3001,
  "services": [
    "myntd",
    "web",
    "insight-api-mynt",
    "insight-ui-mynt"
  ],
  "allowedOriginRegexp": "^https://<yourdomain>\\.<yourTLD>$",
  "messageLog": "",
  "servicesConfig": {
    "web": {
      "disablePolling": true,
      "enableSocketRPC": false
    },
    "insight-ui-mynt": {
      "routePrefix": "",
      "apiPrefix": "api"
    },
    "insight-api-mynt": {
      "routePrefix": "api",
      "coinTicker" : "https://api.coinmarketcap.com/v1/ticker/myntcoin/?convert=USD",
      "coinShort": "MYNT",
	    "db": {
		  "host": "127.0.0.1",
		  "port": "27017",
		  "database": "mynt-api-livenet",
		  "user": "",
		  "password": ""
	  }
    },
    "myntd": {
      "sendTxLog": "/home/<yourusername>/.myntcore/pushtx.log",
      "spawn": {
        "datadir": "/home/<yourusername>/.myntcore/data",
        "exec": "/home/<yourusername>/myntcore/node_modules/myntcore-node/bin/myntd",
        "rpcqueue": 1000,
        "rpcport": 7774,
        "zmqpubrawtx": "tcp://127.0.0.1:28332",
        "zmqpubhashblock": "tcp://127.0.0.1:28332"
      }
    }
  }
}
````
Quick note on allowing socket.io from other services. 
- If you would like to have a seperate services be able to query your api with live updates, remove the "allowedOriginRegexp": setting and change "disablePolling": to false. 
- "enableSocketRPC" should remain false unless you can control who is connecting to your socket.io service. 
- The allowed OriginRegexp does not follow standard regex rules. If you have a subdomain, the format would be(without angle brackets<>):
````
"allowedOriginRegexp": "^https://<yoursubdomain>\\.<yourdomain>\\.<yourTLD>$",
````

To setup unique mongo credentials:
````
mongo
>use mynt-api-livenet
>db.createUser( { user: "test", pwd: "test1234", roles: [ "readWrite" ] } )
>exit
````
(then add these unique credentials to your myntcore-node.json)

Copy the following into a file named mynt.conf and place it in ~/.myntcore/data
````json
server=1
whitelist=127.0.0.1
txindex=1
addressindex=1
timestampindex=1
spentindex=1
zmqpubrawtx=tcp://127.0.0.1:28332
zmqpubhashblock=tcp://127.0.0.1:28332
rpcport=7774
rpcallowip=127.0.0.1
rpcuser=myntcoin
rpcpassword=local321 #change to something unique
uacomment=myntcore-sl

mempoolexpiry=72 # Default 336
rpcworkqueue=1100
maxmempool=2000
dbcache=1000
maxtxfee=1.0
dbmaxfilesize=64
````
Launch your copy of myntcore:
````
myntcored
````
You can then view the Myntoin block explorer at the location: `http://localhost:3001`

Create an Nginx proxy to forward port 80 and 443(with a snakeoil ssl cert)traffic:
----
IMPORTANT: this "nginx-myntcore" config is not meant for production use
see this guide [here](https://www.nginx.com/blog/using-free-ssltls-certificates-from-lets-encrypt-with-nginx/) for production usage
````
sudo apt-get install -y nginx ssl-cert
````
copy the following into a file named "nginx-myntcore" and place it in /etc/nginx/sites-available/
````
server {
    listen 80;
    listen 443 ssl;
        
    include snippets/snakeoil.conf;
    root /home/myntcore/www;
    access_log /var/log/nginx/myntcore-access.log;
    error_log /var/log/nginx/myntcore-error.log;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 10;
        proxy_send_timeout 10;
        proxy_read_timeout 100; # 100s is timeout of Cloudflare
        send_timeout 10;
    }
    location /robots.txt {
       add_header Content-Type text/plain;
       return 200 "User-agent: *\nallow: /\n";
    }
    location /myntcore-hostname.txt {
        alias /var/www/html/myntcore-hostname.txt;
    }
}
````
Then enable your site:
````
sudo ln -s /etc/nginx/sites-available/nginx-myntcore /etc/nginx/sites-enabled
sudo rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default
sudo mkdir /etc/systemd/system/nginx.service.d
sudo printf "[Service]\nExecStartPost=/bin/sleep 0.1\n" | sudo tee /etc/systemd/system/nginx.service.d/override.conf
sudo systemctl daemon-reload
sudo systemctl restart nginx
````
Upgrading Myntore full-stack manually:
----

- This will leave the local blockchain copy intact:
Shutdown the myntcored application first, and backup your unique mynt.conf and myntcore-node.json
````
cd ~/
rm -rf .npm .node-gyp myntcore
rm .myntcore/data/mynt.conf .myntcore/myntcore-node.json

#reboot

git clone https://github.com/silence48/myntcore.git
cd myntcore && git checkout lightweight
npm install -g --production
````
(recreate your unique mynt.conf and myntcore-node.json)

- This will redownload a new blockchain copy:
(Some updates may require you to reindex the blockchain data. If this is the case, redownloading the blockchain only takes 20 minutes)
Shutdown the myntcored application first, and backup your unique mynt.conf and myntcore-node.json
````
cd ~/
rm -rf .npm .node-gyp myntcore
rm -rf .myntcore

#reboot

git clone https://github.com/silence48/myntcore.git
cd myntcore && git checkout lightweight
npm install -g --production
````
(recreate your unique mynt.conf and myntcore-node.json)

Undeploying Myntore full-stack manually:
----
````
nvm deactivate
nvm uninstall 10.5.0
rm -rf .npm .node-gyp myntcore
rm .myntcore/data/mynt.conf .myntcore/myntcore-node.json
mongo
>use mynt-api-livenet
>db.dropDatabase()
>exit
````

## Applications

- [Node](https://github.com/silence48/myntcore-node) - A full node with extended capabilities using Myntoin Core
- [Insight API](https://github.com/silence48/insight-api-mynt) - A blockchain explorer HTTP API
- [Insight UI](https://github.com/silence48/insight) - A blockchain explorer web user interface
- (to-do) [Wallet Service](https://github.com/silence48/myntcore-wallet-service) - A multisig HD service for wallets
- (to-do) [Wallet Client](https://github.com/silence48/myntcore-wallet-client) - A client for the wallet service
- (to-do) [CLI Wallet](https://github.com/silence48/myntcore-wallet) - A command-line based wallet client
- (to-do) [Angular Wallet Client](https://github.com/silence48/angular-myntcore-wallet-client) - An Angular based wallet client
- (to-do) [Copay](https://github.com/silence48/copay) - An easy-to-use, multiplatform, multisignature, secure myntcoin wallet

## Libraries

- [Lib](https://github.com/silence48/myntcore-lib) - All of the core Myntoin primatives including transactions, private key management and others
- (to-do) [Payment Protocol](https://github.com/silence48/myntcore-payment-protocol) - A protocol for communication between a merchant and customer
- [P2P](https://github.com/silence48/myntcore-p2p) - The peer-to-peer networking protocol
- (to-do) [Mnemonic](https://github.com/silence48/myntcore-mnemonic) - Implements mnemonic code for generating deterministic keys
- (to-do) [Channel](https://github.com/silence48/myntcore-channel) - Micropayment channels for rapidly adjusting myntcoin transactions
- [Message](https://github.com/silence48/myntcore-message) - Myntoin message verification and signing
- (to-do) [ECIES](https://github.com/silence48/myntcore-ecies) - Uses ECIES symmetric key negotiation from public keys to encrypt arbitrarily long data streams.

## Security

We're using Myntore in production, but please use common sense when doing anything related to finances! We take no responsibility for your implementation decisions.

## Contributing

Please send pull requests for bug fixes, code optimization, and ideas for improvement. For more information on how to contribute, please refer to our [CONTRIBUTING](https://github.com/silence48/myntcore/blob/master/CONTRIBUTING.md) file.

To verify signatures, use the following PGP keys:
- @silence48: http://pgp.mit.edu/pks/lookup?op=get&search=0x009BAB88B3BD190C `EE6F 9673 1EF6 ED85 B12B  0A3F 009B AB88 B3BD 190C`

## License

Code released under [the MIT license](https://github.com/silence48/myntcore/blob/master/LICENSE).
