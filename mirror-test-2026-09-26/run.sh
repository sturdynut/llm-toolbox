#!/usr/bin/env bash
m=$1; p=$2; r=$3; n=$(basename $p .md)
out=transcripts/$m/$n-r$r.md
[[ -s $out ]] && exit 0
for try in 1 2 3; do
  timeout 600 /home/user/llm-toolbox/incubator/mirror-test/scripts/ask.sh $m $p > $out.tmp 2> $out.err && mv $out.tmp $out && rm -f $out.err && exit 0
  sleep $((try*5))
done
echo "FAILED $m $n r$r" >> failures.txt
