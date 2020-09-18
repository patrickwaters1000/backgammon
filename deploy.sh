#!/bin/bash
for file in $( git ls-tree -r master --name-only ); do
    sudo scp -i backgammon-key.pem $file ec2-user@ec2-3-134-114-252.us-east-2.compute.amazonaws.com:~/backgammon/$file
done
