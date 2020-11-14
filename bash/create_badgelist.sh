#!/bin/bash




ORIPATH=$PWD
cd /tmp/mnt
echo '' > "$ORIPATH/badgelist.txt"
COUNT=0
ALLCOUNT=$(ls -l | grep "^d" | wc -l)
for d in ./*; do
  ((COUNT++))
  PERCENT=$(awk "BEGIN {print int(100/$ALLCOUNT*$COUNT)}")
  if [[ -d "$d" ]]; then
    cd "$d"
    if [ ! "$(ls -la ./*-version.txt 2> /dev/null )" ]; then
      echo -e "Generating for $d\n"
      APKNAME=$(ls -t | grep -e "./*\.apk") && APKNAME=${APKNAME#/}
      #echo -e "AAPKNAME: $APKNAME \n\n"

      pv "$APKNAME" > "/tmp/$APKNAME"
      echo "transfer done, now badging"
      BADGING=$(aapt dump badging "/tmp/$APKNAME")
      rm "/tmp/$APKNAME"
      #sleep 10
      PACKAGEVERSION=$(echo "$BADGING" | grep versionCode= | sed -E "s/.*Code='(.*)' version.*/\1/")
      PACKAGENAME=$(echo "$BADGING" | grep package:\ name | awk '/package/{gsub("name=|'"'"'","");  print $2}')
      #echo "ectracted packageversin $PACKAGEVERSION \n"
      #echo "now writing"
      echo "# synced:$PACKAGENAME ($COUNT / $ALLCOUNT)"
      echo "$PACKAGEVERSION" > "$PACKAGENAME-version.txt"
      #cat "$PACKAGENAME-version.txt"
      echo "$PACKAGENAME|$PACKAGEVERSION|$d/$APKNAME" >> "$ORIPATH/badgelist.txt"
      echo "$PERCENT"
      echo "# $COUNT / $ALLCOUNT"
    else
      echo "skipping $d\n"
      APKNAME=$(ls -t | grep -e "./*\.apk") && APKNAME=${APKNAME#/}
      FILE=$(ls -t *-version.txt 2> /dev/null )
      PACKAGENAME=$(echo "$FILE" | sed -e 's/\/\(.*\)-version/\1/'  | rev | cut -c13- | rev)
      echo "# synced:$PACKAGENAME ($COUNT / $ALLCOUNT)"
      if [ "$PACKAGENAME" != "" ]; then
              echo "$PACKAGENAME|$(cat "$FILE")|$d/$APKNAME" >> "$ORIPATH/badgelist.txt"
      fi
      #cat "$(ls -t *_version.txt 2> /dev/null )"
      echo "$PERCENT"
      echo "# $COUNT / $ALLCOUNT ($PERCENT%)"
    fi
    cd ../
  fi
done

mkdir -p /tmp/badges/
cp "$ORIPATH/badgelist.txt" /tmp/badges 2> /dev/null
