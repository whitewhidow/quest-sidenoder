//when dir listing comes back, list it
ipcRenderer.on('get_dir', (event, arg) => {
    console.log("get_dir msg came: ");
    console.log(arg);
    $("#listTable tbody").html('');
    if (arg.success) {
        $("#path").html(arg.path);
        loadDir(arg.path, arg.list);
        fixIcons();
    }
});

//sort
$(document).on('click', '.set-sort', (el) => {
    $("#browseCardBody .listitem").sort(sortBy($(el.target).data('key'), $(el.target).data('asc') == '1')).appendTo('#browseCardBody');
    $("#listTable tbody .listitem").sort(sortBy($(el.target).data('key'), $(el.target).data('asc') == '1')).appendTo('#listTable');

    //TODO: sort doesnt work on regular folders, only cards
});
//sort
function sortBy(key, asc) {
    return ((a, b) => {
        var valA = $(a).data(key);
        var valB = $(b).data(key);
        if (valA < valB) {
            return asc ? -1 : 1;
        }
        if (valA > valB) {
            return asc ? 1 : -1;
        }
        return 0;
    });
}




function loadDir(path, list) {
    let UpDir = path.substr(0, path.lastIndexOf("/"));
    $("#listTableStart tbody").html(`<tr><td class="browse-folder "><a data-path="${UpDir}" onclick="getDir(this)"><i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;../ (up one directory)</a><td></tr>`)
    $("#browseCardBody").html('');
    for (item in list) {
        let name = list[item].name
        fullPath = list[item].filePath.replace("\\", "/").replace("", ":")


        if (list[item].isFile) {
            if (list[item].name.endsWith(".apk")) {
                row = $("#listTable tbody").append(`<tr class="listitem" data-name="${list[item].name.toUpperCase()}" data-createdat="${list[item].createdAt.getTime()}"><td><a data-path="${fullPath}" onclick='getDir(this)'><b><i class="browse-file fa fa-upload" aria-hidden="true"></i> &nbsp;` + `${name}</b></a><td></tr>`)
            } else {
                row = $("#listTable tbody").append(`<tr class="listitem" data-name="${list[item].name.toUpperCase()}" data-createdat="${list[item].createdAt.getTime()}"><td><i class="browse-file fa fa-file-o" aria-hidden="true"></i> &nbsp;` + `${name}<td></tr>`)
            }
        } else {
            if (list[item].imagePath) {

                if (list[item].mp) {
                    mpribbon = `<div class="ribbon-wrapper-green"><div class="ribbon-green">MP!</div></div>`
                } else {
                    mpribbon = ''
                }

                if (list[item].versionCode !== 'PROCESSING') {
                    selectBtn = `<a  data-path="${fullPath}" onclick='getDir(this)'><span class="btn btn-outline-secondary btn-block">select</span></a>`
                } else {
                    selectBtn = `<a><span class="btn btn-outline-secondary btn-block">${list[item].versionCode}</span></a>`
                }

                //row = $("#listTable tbody").append("<tr><td class='browse-folder' ><a onclick='getDir(\"" + fullPath + "\")'><i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;" + `${name}</a><td></tr>`)
                row = $("#browseCardBody").append(`<div class="col mb-4 listitem" data-name="${list[item].name.toUpperCase()}" data-createdat="${list[item].createdAt.getTime()}">
          <div class="card h-100">

            ${mpribbon}


<img src="${list[item].imagePath}" style="max-height: 100px" class="card-img-top" alt="...">

            <div class="card-body">

              <p class="card-text" style="color: black">
${list[item].simpleName}<br><br>

${selectBtn}


</p>
            </div>
            <div style="color: gray" class="card-footer">v. ${list[item].versionCode}</div>

          </div>
        </div>`);
            } else {

                row = $("#listTable tbody").append(`<tr class="listitem" data-name="${list[item].name.toUpperCase()}" data-createdat="${list[item].createdAt.getTime()}"><td class='browse-folder'>
<a data-path="${fullPath}" onclick='getDir(this)'>
<i class=\"fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;` + `${name}</a><td></tr>`)
            }

        }
        //console.log("appended "+ name);
    }

    $("#browseCardBody .listitem").sort(sortBy('createdat', false)).appendTo('#browseCardBody');

    $("#listTableEnd tbody").html(`<tr><td class="browse-folder "><a data-path="${UpDir}" onclick="getDir(this)"><i class=\"browse-folder fa fa-folder-o\" aria-hidden=\"true\"></i> &nbsp;../ (up one directory)</a><td></tr>`)
}




function fixIcons() {
    $(".browse-folder").hover(
        function () {
            console.log("HOVER");
            $(this).find("i").removeClass("fa-folder-o")
            $(this).find("i").addClass("fa-folder-open-o")
        }, function () {
            $(this).find("i").addClass("fa-folder-o")
            $(this).find("i").removeClass("fa-folder-open-o")
        }
    );
}