#!/bin/bash



ORIPATH=$PWD


addToSyncedFile () {
    DIRZ=${1::-1}
    DIRZ=${DIRZ%%\ -steam*}
    DIRZ=${DIRZ%%\ -oculus*}
    DIRZ=${DIRZ%%\ -versionCode*}
    DIRZ=${DIRZ%%\ -packageName*}
    DIRZ=${DIRZ%%\ -MP-*}
    DIRZ=${DIRZ%%\ -NA-*}
    echo "$DIRZ/**" | cut -c 3- >> "$ORIPATH/../blacklist.txt"
}


cd /tmp/mnt
COUNT=0
FAILCOUNT=0
ALLCOUNT=$(ls -l -d */ | grep "^d" | wc -l)



for d in ./*/; do

  ((COUNT++))

  if [[ ! ($d =~ .*\ -steam-.*) ]] && [[ ! ($d =~ .*\ -oculus-.*) ]] && [[ ! ($d =~ .*\ -NA-.*) ]]; then



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

    SEARCH=${SEARCH%% - Untethered*}
    SEARCH=${SEARCH%%v1*}




    echo "Generating $SEARCH for $d"

    regex="-packageName-([a-zA-Z\d\_.]*)"
    if [[ $d =~ $regex ]]; then
        name="${BASH_REMATCH[1]}"
        #echo "packagename in map: ${name}"

        existingDir=''
        existingDir=$(find ../ -maxdepth 1 -type d -name "*${name}*" -print)
        if [[ "$existingDir" != "" ]]; then
          echo "existingDir found: ${existingDir}"
          idregex="-steam-([0-9]*)"
          if [[ $existingDir =~ $idregex ]]; then
            foundif="${BASH_REMATCH[1]}"
            echo "REUSING foundid found: ${foundif}"
            DIRZ=${d::-1}
            cd ../
            mv "$DIRZ" "${d::-1} -steam-${foundif}"
            addToSyncedFile "$d"
            continue
          fi

          idregex="-oculus-([0-9]*)"
          if [[ $existingDir =~ $idregex ]]; then
            foundif="${BASH_REMATCH[1]}"
            echo "REUSING foundid found: ${foundif}"
            DIRZ=${d::-1}
            cd ../
            mv "$DIRZ" "${d::-1} -oculus-${foundif}"
            addToSyncedFile "$d"
            continue
          fi

          idregex="-NA-"
          if [[ $existingDir == *"-NA-"* ]]; then
            echo "-NA- found:"
            DIRZ=${d::-1}
            cd ../
            mv "$DIRZ" "${d::-1} -NA-"
            addToSyncedFile "$d"
            continue
          fi

#          if [[ "$existingDir" != *"-NA-"* ]]; then
#            foundif="${BASH_REMATCH[1]}"
#            echo "REUSING foundid found: ${foundif}"
#            DIRZ=${d::-1}
#            cd ../
#            mv "$DIRZ" "${d::-1} -oculus-${foundif}"
#            addToSyncedFile "$d"
#            continue
#          fi

        fi

    fi

#    if compgen -G "${PROJECT_DIR}/*.png" > /dev/null; then
#        echo "pattern exists!"
#    fi
    #sleep 1
#    cd ..
#    continue
#    sleep 19
#    exit



    link=$(curl  -G --silent --data-urlencode "vrsupport=1" --data-urlencode "term=$SEARCH" -L "https://store.steampowered.com/search/" | sed -En '/search_capsule"><img/s/.*src="([^"]*)".*/\1/p' | head -n 1)

    link=${link%%\?*}

    echo "$link\n"

    if [[ "$link" != *".jpg" ]] || [[ "$link" == *"/bundles/"* ]] || [[ "$link" == "" ]] || [[ "$link" != *"jpg" ]] ;then
      echo "NOT A REAL IMAGE -> $link"
      ((FAILCOUNT++))
      cd ..

      mv "${d::-1}" "${d::-1} -NA-"


      continue
    fi







    if [[ "$link" != "" ]] && [[ "$link" == *"jpg" ]];then

      ID=${link%%/capsule_*}
      ID=${ID##*apps/}
      echo "ID FOUND: $ID"
      DIRZ=${d::-1}
      #echo "d: $DIRZ"
      cd ../


      mv "$DIRZ" "${d::-1} -steam-$ID"

    else
      cd ../
    fi



  fi

  addToSyncedFile "$d"
done

sort -u "$ORIPATH/../blacklist.txt" > "$ORIPATH/../blacklistUNIQUE.txt"
mv "$ORIPATH/../blacklistUNIQUE.txt" "$ORIPATH/../blacklist.txt"


echo "$COUNT items looped"
echo "$FAILCOUNT items failed"
#echo "$(cat $ORIPATH/../quotesynced.txt | wc -l) from quotesynced.txt"
paplay /usr/share/sounds/ubuntu/ringtones/Bliss.ogg
sleep 99


