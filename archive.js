var number_of_posts = 25;
var count = 0;

$(document).ready(() => {
    document.getElementById("generate_url_action").addEventListener("click", () => {
        var subreddit_name = document.getElementById("subreddit_name").value;
        var start_with_post = document.getElementById("start_with_post").value;

        document.getElementById("url_output").value = scrape_subreddit_url(subreddit_name, start_with_post);
    });

    document.getElementById("copy_to_clipboard").addEventListener("click", () => {
        copy_to_clipboard(document.getElementById("url_output").value);
    });

    document.getElementById("process_html").addEventListener("click", () => {
        var html = document.getElementById("html_input").value;

        if (html != "") {
            console.log("Processing HTML...");
            process_html(html);
        }
    });
});

function scrape_subreddit_url(subreddit_name = "", start_with_post = "") {
    var start_with_specific_post = start_with_post != "" && start_with_post.length == 6;

    console.log(
        `URL for scraping subreddit "${subreddit_name}" for ${number_of_posts} posts` +
            (start_with_specific_post ? ` after the post with the id ${start_with_post}` : "")
    );

    var url = `https://old.reddit.com/r/${subreddit_name}/?count=${count}${
        start_with_specific_post ? `&after=t3_${start_with_post}` : ""
    }`;

    return url;
}

async function process_html(html = "") {
    var newHTMLDocument = document.implementation.createHTMLDocument("process");
    var elem = newHTMLDocument.createElement("div");
    elem.innerHTML = html;

    jqueryElem = $(elem);

    var output_array = [];
    // find the elements that start with the known id prefix
    jqueryElem.find("[id^=thing_t3_]:not(.promoted):not(.stickied)").each((index, element) => {
        element = $(element);

        // extract metadata
        var post_id = element.attr("id").substring(9);
        var post_title = element.find(".title .title").first().text();
        var image_url = parse_for_image_url(element);

        if (image_url != "") {
            output_array.push({
                id: post_id,
                direct_link: `https://redd.it/${post_id}`,
                title: post_title,
                image_link: image_url,
                series_index: count,
            });
            count += 1;
        }
    });

    // update the fields for the next step
    document.getElementById("start_with_post").value = output_array[output_array.length - 1]["id"];
    document.getElementById("generate_url_action").click();
    document.getElementById("copy_to_clipboard").click();
    document.getElementById("html_input").value = "";

    console.log("Information processed and advanced for next step");

    // download the images and zip them
    var zip = new JSZip();
    await Promise.all(
        output_array.map(async (post) => {
            var link = post.image_link;

            const blob = await fetch(link).then((response) => {
                if (!response.ok) {
                    console.error("Network response was not OK");
                }
                return response.blob();
            });

            const file_extension = link.substring(link.lastIndexOf("."));
            const hash_string = await hash_blob(blob);

            post["hash_filename"] = hash_string + file_extension;
            zip.file(hash_string + file_extension, blob);

            return Promise.resolve(1);
        })
    );

    zip.file("contents.json", JSON.stringify(output_array));

    zip.generateAsync({ type: "blob" }).then(function (content) {
        // see FileSaver.js
        saveAs(content, "example.zip");
    });
}

function copy_to_clipboard(text = "") {
    navigator.clipboard.writeText(text);
}

function parse_for_image_url(jqueryElem) {
    var url = "";

    if (jqueryElem.html().includes("i.redd.it") || jqueryElem.html().includes("i.imgur.com")) {
        url = jqueryElem.attr("data-url");
    }

    return url;
}

function hash_blob(blob) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.addEventListener("load", () => {
            crypto.subtle.digest("SHA-1", fileReader.result).then((buffer) => {
                const typedArray = new Uint8Array(buffer);
                resolve(Array.prototype.map.call(typedArray, (x) => ("00" + x.toString(16)).slice(-2)).join(""));
            });
        });
        fileReader.addEventListener("error", () => {
            reject(fileReader.error);
        });

        fileReader.readAsArrayBuffer(blob);
    });
}