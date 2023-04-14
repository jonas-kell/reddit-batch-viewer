$(document).ready(async () => {
    let session_names_div = $("#sessions_radio_buttons");
    let sessionsMeta = await recreateSessionsMeta();
    Object.values(sessionsMeta).forEach((sessionMeta) => {
        session_names_div.append(`
            <input type="radio" id="${sessionMeta.name}" name="sessions_select" value="${sessionMeta.name}" class="selects_session" />
            <label for="${sessionMeta.name}">${sessionMeta.name}</label>
            <br />
            `);
    });
    $(".selects_session").on("click", function () {
        let res = selectSession($(this).attr("value"));

        if (!res && $(this).attr("value") != "default") {
            selectSession("default");
            $("#default").prop("checked", true);
        }

        $("#load_files_from_session").click(); // trigger display loading if this hidden button is present on the page
    });
});
