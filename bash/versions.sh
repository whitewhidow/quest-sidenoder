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
#echo -ne '' > "$ORIPATH/../syncedversion.txt"
COUNT=0
FAILCOUNT=0
ALLCOUNT=$(ls -l -d */ | grep "^d" | wc -l)



for d in ./*/; do
  PACKAGEVERSION=''
  ((COUNT++))

  if [[ ! ($d =~ .*\ -versionCode-.*) ]] && [[ ! ($d =~ .*\ -packageName-.*) ]]; then

    cd "$d"


    echo "Generating for $d"
    BADGING=$(aapt dump badging *.apk)
    PACKAGEVERSION=$(echo "$BADGING" | grep versionCode= | sed -E "s/.*Code='(.*)' version.*/\1/")
    PACKAGENAME=$(echo "$BADGING" | grep package:\ name | awk '/package/{gsub("name=|'"'"'","");  print $2}')


    echo $PACKAGEVERSION
    echo $PACKAGENAME

    if [[ "$PACKAGEVERSION" != '' ]] && [[ "$PACKAGENAME" != '' ]]; then
      cd ../
      mv "${d::-1}" "${d::-1} -versionCode-$PACKAGEVERSION -packageName-$PACKAGENAME"
    else
      echo "Version or name not found ???"
      cd ../
      mv "${d::-1}" "${d::-1} -versionCode-0 -packageName-0"
    fi




    #sleep 10

  else
    DIRZ=${d::-1}
    DIRZ=${DIRZ%%\ -steam*}
    DIRZ=${DIRZ%%\ -oculus*}
    DIRZ=${DIRZ%%\ -versionCode*}
    DIRZ=${DIRZ%%\ -packageName*}
    DIRZ=${DIRZ%%\ -MP-*}
    echo "$DIRZ/**" | cut -c 3- >> "$ORIPATH/../blacklist.txt"
    #echo "skipping $DIRZ already fixed"
  fi


addToSyncedFile "$d"
done


sort -u "$ORIPATH/../blacklist.txt" > "$ORIPATH/../blacklistUNIQUE.txt"
mv "$ORIPATH/../blacklistUNIQUE.txt" "$ORIPATH/../blacklist.txt"


echo "$COUNT items looped"
#echo "$FAILCOUNT items failed"
#echo "$(cat $ORIPATH/../quotesynced.txt | wc -l) from quotesynced.txt"
paplay /usr/share/sounds/ubuntu/ringtones/Bliss.ogg