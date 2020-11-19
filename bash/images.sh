#!/bin/bash



ORIPATH=$PWD
cd /tmp/mnt
echo -ne '' > "$ORIPATH/../synced.txt"
COUNT=0
FAILCOUNT=0
ALLCOUNT=$(ls -l -d */ | grep "^d" | wc -l)



for d in ./*/; do

  ((COUNT++))

  if [[ ! ($d =~ .*\ -steam-.*) ]] && [[ ! ($d =~ .*\ -oculus-.*) ]]; then



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
    SEARCH=${SEARCH%%v1*}




    echo "Generating $SEARCH for $d"


    link=$(curl  -G --silent --data-urlencode "vrsupport=1" --data-urlencode "term=$SEARCH" -L "https://store.steampowered.com/search/" | sed -En '/search_capsule"><img/s/.*src="([^"]*)".*/\1/p' | head -n 1)

    link=${link%%\?*}

    echo "$link"

    if [[ "$link" != *".jpg" ]] || [[ "$link" == *"/bundles/"* ]] ;then
      echo "NOT A REAL IMAGE -> $link"
      ((FAILCOUNT++))
      cd ..
      continue
    fi


    sleep 3




    if [[ "$link" != "" ]] && [[ "$link" == *"jpg" ]];then

      ID=${link%%/capsule_*}
      ID=${ID##*apps/}
      echo "ID FOUND: $ID"
      DIRZ=${d::-1}
      echo "d: $DIRZ"
      cd ../

      #old_mtime=$(stat -c%Y "$DIRZ")

      mv "$DIRZ" "${d::-1} -steam-$ID"

      #touch -t"$old_mtime" "${d::-1} -steam-$ID"



      echo "$DIRZ/**" | cut -c 3- >> "$ORIPATH/../synced.txt"
      #${var%%SubStr*}
    else
      cd ../
    fi





  else
    DIRZ=${d::-1}
    DIRZ=${DIRZ%%\ -steam*}
    echo "$DIRZ/**" | cut -c 3- >> "$ORIPATH/../synced.txt"
    #echo "skipping $DIRZ already fixed"
  fi

  #sleep 5
done

echo "$COUNT items looped"
echo "$FAILCOUNT items failed"
paplay /usr/share/sounds/ubuntu/ringtones/Bliss.ogg
sleep 99