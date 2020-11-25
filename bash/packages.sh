#!/bin/bash



ORIPATH=$PWD
cd /tmp/mnt
echo -ne '' > "$ORIPATH/../syncedpackage.txt"
COUNT=0
FAILCOUNT=0
ALLCOUNT=$(ls -l -d */ | grep "^d" | wc -l)



for d in ./*/; do
  PACKAGEVERSION=''
  ((COUNT++))

  if [[ ! ($d =~ .*\ -packageName-.*) ]]; then



    cd "$d"


    echo "Generating for $d"
    BADGING=$(aapt dump badging *.apk)
    #PACKAGEVERSION=$(echo "$BADGING" | grep versionCode= | sed -E "s/.*Code='(.*)' version.*/\1/")
    PACKAGENAME=$(echo "$BADGING" | grep package:\ name | awk '/package/{gsub("name=|'"'"'","");  print $2}')

    echo $PACKAGENAME

    if [[ "$PACKAGENAME" != '' ]]; then
      cd ../
      mv "${d::-1}" "${d::-1} -packageName-$PACKAGENAME"
    else
      echo "Packagename not found ???"
      cd ../
      mv "${d::-1}" "${d::-1} -packageName-0"
    fi


    echo "$DIRZ/**" | cut -c 3- >> "$ORIPATH/../syncedpackage.txt"


    #sleep 10

  else
    DIRZ=${d::-1}
    DIRZ=${DIRZ%%\ -steam*}
    DIRZ=${DIRZ%%\ -oculus*}
    DIRZ=${DIRZ%%\ -versionCode*}
    DIRZ=${DIRZ%%\ -packageName*}
    echo "$DIRZ/**" | cut -c 3- >> "$ORIPATH/../syncedpackage.txt"
    #echo "skipping $DIRZ already fixed"
  fi


done


cat "$ORIPATH/../syncedpackage.txt" >> "$ORIPATH/../synced.txt"
echo ""  >> "$ORIPATH/../synced.txt"


cat "$ORIPATH/../quotesynced.txt" >> "$ORIPATH/../synced.txt"
echo ""  >> "$ORIPATH/../synced.txt"
cat "$ORIPATH/../syncedversion.txt" >> "$ORIPATH/../synced.txt"

sort -u "$ORIPATH/../synced.txt" > "$ORIPATH/../syncedUNIQUE.txt"
mv "$ORIPATH/../syncedUNIQUE.txt" "$ORIPATH/../synced.txt"
#echo $(awk '!a[$0]++' "$ORIPATH/../synced.txt") > "$ORIPATH/../synced.txt"

echo "$COUNT items looped"
#echo "$FAILCOUNT items failed"
#echo "$(cat $ORIPATH/../quotesynced.txt | wc -l) from quotesynced.txt"
paplay /usr/share/sounds/ubuntu/ringtones/Bliss.ogg
sleep 99