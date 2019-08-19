DelphiOracle RNG Script

Testing instructions:

1) Copy .env.sample to .env

2) Edit .env with your info

3) npm install

4) node main.js


To run continuously, create a shell script and add to crontab.


Example shell script:


```
cd /home/user/delphi-rng-script/
node /home/user/delphi-rng-script/main.js
```


Example crontab entry:
```
* * * * * /home/user/delphi-rng-script/update.sh
```