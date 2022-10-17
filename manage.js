let control_json = [];
let zip_file_array = [];

$(document).ready(() => {
    document.getElementById("update_decryption_key").addEventListener("click", () => {
        set_key_to_use("decryption_key", "update_decryption_key");
    });

    document.getElementById("open_zip").addEventListener("click", async () => {
        let fileHandle;
        [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();

        // reset storage containers
        zip_file_array = [1];
        control_json = [];

        // read in zip file
        await read_in_zip_file(file, 0);

        // sort or randomize order
        reorder_control_array();

        // reset display
        reset_display();
    });

    $("#zip_filepicker").on("change", async function (evt) {
        var files = evt.target.files;
        const nr_zip_files = files.length;

        // reset storage containers
        zip_file_array = Array.from(Array(nr_zip_files).keys());
        control_json = [];

        // read in zip files
        for (var i = 0; i < nr_zip_files; i++) {
            await read_in_zip_file(files[i], i);
        }

        // sort or randomize order
        reorder_control_array();

        // reset display
        reset_display();
    });

    $(document).on("click", ".view_prev", () => {
        let number = parseInt(document.getElementById("current_number_top").value);

        select_post(number - 1);
    });

    $(document).on("click", ".view_next", () => {
        let number = parseInt(document.getElementById("current_number_top").value);

        select_post(number + 1);
    });

    $("#post_width").on("change", () => {
        select_post(document.getElementById("current_number_top").value);
    });
});

async function read_in_zip_file(file, index) {
    await JSZip.loadAsync(file).then(async function (zip) {
        zip_file_array[index] = zip; // push directly into permanent zip file storage

        let contents = zip.files["contents.json"];
        let json = JSON.parse(await contents.async("text"));

        if (encryption_on()) {
            for (let j = 0; j < json.length; j++) {
                json[j].id = await decrypt_text(json[j].id, json[j]["iv_string"] ?? "");
                json[j].author = await decrypt_text(json[j].author, json[j]["iv_string"] ?? "");
                json[j].direct_link = await decrypt_text(json[j].direct_link, json[j]["iv_string"] ?? "");
                json[j].title = await decrypt_text(json[j].title, json[j]["iv_string"] ?? "");
                json[j].media_url = await decrypt_text(json[j].media_url, json[j]["iv_string"] ?? "");
                json[j].subreddit = await decrypt_text(json[j].subreddit ?? "", json[j]["iv_string"] ?? "");
            }
        }

        for (let j = 0; j < json.length; j++) {
            json[j]["use_zip_file_nr"] = index; // cache in what zip file the image can be found
            control_json.push(json[j]); // append directly to permanent control array
        }
    });
}

async function select_post(number) {
    if (number >= 0 && number < control_json.length) {
        // ok region
    } else {
        number = 0;
    }

    $(".current_number").each((index, element) => {
        $(element).val(number);
    });

    let zip_file_nr = 0;
    if (control_json[number]["use_zip_file_nr"] != undefined) {
        zip_file_nr = control_json[number]["use_zip_file_nr"];
    }

    await display_post(control_json[number], zip_file_nr);
}

async function display_post(json_post, zip_file_nr = 0) {
    let browser_target = document.getElementById("view_target");

    let title = json_post.title;
    let author = json_post.author;
    let link = json_post.direct_link;
    let subreddit = json_post.subreddit ?? "";

    // regenerate blob
    let visual_contents = await zip_file_array[zip_file_nr].files[json_post.hash_filename].async("blob");
    visual_contents = visual_contents.slice(0, visual_contents.size, json_post.mime_type); // write original mime type back into
    visual_contents = await decrypt_blob(visual_contents, json_post["iv_string"] ?? "");

    const style = `style="width: ${$("#post_width").val()}%;"`;

    let content = "";
    // generate media element
    if (visual_contents.type.includes("video")) {
        content = `<video ${style} autoplay muted controls loop><source src="${await blobToBase64(
            visual_contents
        )}">Your browser does not support the video tag.</video>`;
    } else {
        // assume image mime type
        content = `<img src="${await blobToBase64(visual_contents)}"  ${style}></img>`;
    }

    // set html output
    browser_target.innerHTML = `<h4>${subreddit}</h4><h2>${title}</h2>${content}<h4>${author}</h4><span>${link}</span><div style="position: absolute; top:3em; bottom:6em; left: 0; right: 60%;" class="view_prev"></div><div style="position: absolute; top:3em; bottom:6em; right: 0; left: 60%;" class="view_next"></div>`;
}

function reset_display() {
    // set max number display
    $(".max_number").each((index, element) => {
        $(element).html(control_json.length - 1);
    });

    // get image files from zip and append to display
    select_post(0);
}

function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

function shuffle(array) {
    const newArray = [...array];
    const length = newArray.length;

    for (let start = 0; start < length; start++) {
        const randomPosition = Math.floor((newArray.length - start) * Math.random());
        const randomItem = newArray.splice(randomPosition, 1);

        newArray.push(...randomItem);
    }

    return newArray;
}

function reorder_control_array() {
    // sort by series index, as order might have been changed
    if (document.getElementById("randomize").checked) {
        // random order
        control_json = shuffle(control_json);
    } else {
        control_json = control_json.sort(function (a, b) {
            return a.series_index - b.series_index;
        });
    }
}
