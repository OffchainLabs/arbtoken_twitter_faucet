## twitter faucet
### Run with docker

build docker:
```
docker build -t faucet .
```
we should modify env_docker.smaple and copy to env_docker
```
cp .env.smaple env_docker
```
and you shoud edit then start:
```
docker run --name={nitro_faucet} --env-file=./env_docker -d faucet start
```

