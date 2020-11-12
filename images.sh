#!/bin/bash



ORIPATH=$PWD
cd /tmp/mnt
echo '' > "$ORIPATH/imagelist.txt"
COUNT=0
ALLCOUNT=$(ls -l -d */ | grep "^d" | wc -l)



for d in ./*/; do
  if [[ ! ($d =~ .*\[steam:.*) ]]; then

    cd "$d"

    SEARCH=${d%%v1.*}
    SEARCH=$(echo "$SEARCH"  | cut -c 3- | tr -s '_' ' ')
    SEARCH=${SEARCH%%v2.*}
    SEARCH=${SEARCH%%v3.*}
    SEARCH=${SEARCH%%v4.*}
    SEARCH=${SEARCH%%v6.*}
    SEARCH=${SEARCH%%\[*}
    SEARCH=${SEARCH%%v[0-9].*}
    SEARCH=${SEARCH%%[0-9].[0-9].*}
    SEARCH=${SEARCH%%v[0-9][0-9]*}
    SEARCH=${SEARCH%%v[0-9][0-9].*}
    echo "term: $SEARCH"



    echo -e "Generating for $d\n"


    link=$(curl  -G  --data-urlencode "vrsupport=1" --data-urlencode "term=$SEARCH" -L "https://store.steampowered.com/search/" | sed -En '/search_capsule"><img/s/.*src="([^"]*)".*/\1/p' | head -n 1)
    link=$(echo "$link" | rev | cut -c14- | rev)

    if [[ "$link" != "" ]] && [[ $link =~ .*\.jpg$ ]];then

      ID=${link%%/capsule_*}
      ID=${ID##*apps/}
      echo "ID FOUND: $ID"
      echo "d: ${d::-1}"
      cd ../
      mv "${d::-1}" "${d::-1} [steam:$ID"
    else
      cd ../
    fi
    sleep 5

  else
    echo "skipping $d already fixed"
  fi
done

mkdir -p /tmp/badges/
cp "$ORIPATH/imagelist.txt" /tmp/badges 2> /dev/null

