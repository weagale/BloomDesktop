// listen for messages sent to this iframe
window.addEventListener('message', processMessage, false);

var desiredGPCs;
var previousGPCs;
var sightWords;

/**
 * Respond to messages from the parent document
 * @param {Event} event
 */
function processMessage(event) {

    var params = event.data.split("\n");

    switch(params[0]) {
        case 'OK':
            saveClicked();
            return;

        case 'Data':
            loadReaderSetupData(params[1]);

            // initialize the selected letters
            $('#stages-table tbody tr:first').click();
            return;

        case 'Files':
            document.getElementById('dls_word_lists').value = params[1].replace(/\r/g, '\n');
            return;

        case 'Words':
            updateMatchingWords(params[1]);
            return;
    }
}

/**
 * Fires an event for C# to handle.
 * The listeners in C# are set up in EditingModel.cs, in the function "DocumentCompleted()", and using this
 * syntax: _view.AddMessageEventListener("nameOfEvent", FunctionThatHandlesTheEvent);
 * @param {String} eventName
 * @param {String} eventData Note: use JSON.stringify if passing object data.
 */
function fireCSharpSetupEvent(eventName, eventData) {

    var event = new MessageEvent(eventName, {'view' : window, 'bubbles' : true, 'cancelable' : true, 'data' : eventData});
    document.dispatchEvent(event);
}

/**
 * Pass the settings to C# to be saved.
 */
function saveClicked() {

    // get the values
    var s = new Object();
    s.letters = document.getElementById('dls_letters').value.trim();
    s.letterCombinations = document.getElementById('dls_letter_combinations').value.trim();
    s.moreWords = document.getElementById('dls_more_words').value.trim().replace(/\n/g, ' ');

    // stages
    s.stages = [];
    var stages = $('#stages-table tbody tr');
    for (var i = 0; i < stages.length; i++) {
        var stage = new Object();
        stage.letters = stages[i].cells[1].innerHTML;
        stage.sightWords = stages[i].cells[2].innerHTML;
        s.stages.push(stage);
    }

    // send to parent
    var settingsStr = JSON.stringify(s);
    window.parent.postMessage('Refresh\n' + settingsStr, '*');

    // send to C#
    fireCSharpSetupEvent('saveDecodableLevelSettingsEvent', settingsStr);
}

/**
 * Initializes the dialog with the current settings.
 * @param {String} jsonData The contents of the settings file
 */
function loadReaderSetupData(jsonData) {

    if (!jsonData) return;

    // validate data
    var data = JSON.parse(jsonData);
    if (!data.letters) data.letters = '';
    if (!data.letterCombinations) data.letterCombinations = '';
    if (!data.moreWords) data.moreWords = '';

    // language tab
    document.getElementById('dls_letters').value = data.letters;
    document.getElementById('dls_letter_combinations').value = data.letterCombinations;
    document.getElementById('dls_more_words').value = data.moreWords.replace(/ /g, '\n');

    // stages tab
    displayLetters();
    var stages = data.stages;
    var tbody = $('#stages-table tbody');
    tbody.html('');

    for (var i = 0; i < stages.length; i++) {
        if (!stages[i].letters) stages[i].letters = '';
        if (!stages[i].sightWords) stages[i].sightWords = '';
        tbody.append('<tr class="linked"><td>' + (i + 1) + '</td><td>' + stages[i].letters + '</td><td>' + stages[i].sightWords + '</td></tr>');
    }

    // click event for stage rows
    $('#stages-table tbody tr').click(function() {
        selectStage(this);
        displayLetters();
        selectLetters(this);
    });
}

/**
 * Update the fields when a different stage is selected
 * @param {HtmlElement} tr The selected table row element
 */
function selectStage(tr) {

    if (tr.classList.contains('selected')) return;

    var currentStage = tr.cells[0].innerHTML;
    document.getElementById('setup-stage-number').innerHTML = currentStage;
    document.getElementById('remove-stage-number').innerHTML = currentStage;
    document.getElementById('setup-stage-sight-words').value = tr.cells[2].innerHTML;

    $('#stages-table tbody tr.selected').removeClass('selected').addClass('linked');
    $(tr).removeClass('linked').addClass('selected');

    // get the words
    getWordsForSelectedStage();
}

function getWordsForSelectedStage() {

    var tr = $('#stages-table tbody tr.selected').get(0);

    desiredGPCs = (tr.cells[1].innerHTML).split(' ');
    previousGPCs = $.makeArray($(tr).prevAll().map(function() {
        return this.cells[1].innerHTML.split(' ');
    }));

    var knownGPCS = previousGPCs.join(' ') + ' ' + desiredGPCs.join(' ');

    sightWords = $.makeArray($(tr).prevAll().map(function() {
        return this.cells[2].innerHTML.split(' ');
    }));
    sightWords = _.union(sightWords, (tr.cells[2].innerHTML).split(' '));

    window.parent.postMessage('Words\n' + knownGPCS, '*');
}

/**
 * Update the stage when a letter is selected or unselected.
 * @param {HtmlElement} div
 */
function selectLetter(div) {

    // update the css classes
    if (div.classList.contains('unselected-letter'))
        $(div).removeClass('unselected-letter').addClass('current-letter');
    else if (div.classList.contains('current-letter'))
        $(div).removeClass('current-letter').addClass('unselected-letter');
    else
        return;

    // update the stages table
    var letters = $('.current-letter').map(function() {
        return this.innerHTML;
    });
    $('#stages-table tbody tr.selected td:nth-child(2)').html($.makeArray(letters).join(' '));

    getWordsForSelectedStage();
}

/**
 * Creates the grid of available graphemes
 */
function displayLetters() {

    var letters = (document.getElementById('dls_letters').value.trim() + ' ' + document.getElementById('dls_letter_combinations').value.trim()).split(' ');
    letters = letters.filter(function(n){ return n !== ''; });

    /**
     * If there are more than 30 letters the parent div containing the letter divs will scroll vertically, so the
     * letter divs need to be different widths to accommodate the scroll bar.
     *
     * The suffix 's' stands for 'short', and 'l' stands for 'long.'
     *
     * parent div class rs-letter-container-s does not scroll
     * parent div class rs-letter-container-l scrolls vertically
     *
     * letter div class rs-letters-s fit 6 on a row
     * letter div class rs-letters-l fit 5 on a row (because of the scroll bar)
     */
    var suffix = 's';
    if (letters.length > 30) suffix = 'l';

    var div = $('#setup-selected-letters');
    div.html('');
    div.removeClass('rs-letter-container-s').removeClass('rs-letter-container-l').addClass('rs-letter-container-' + suffix);

    for (var i = 0; i < letters.length; i++) {
        div.append($('<div class="unselected-letter rs-letters rs-letters-' + suffix + '">' + letters[i] + '</div>'));
    }

    $('div.rs-letters').click(function() {
        selectLetter(this);
    });
}

/**
 * Highlights the graphemes for the current stage
 * @param {HtmlElement} tr Table row
 */
function selectLetters(tr) {

    // remove current formatting
    var letters = $('.rs-letters').removeClass('current-letter').removeClass('previous-letter').addClass('unselected-letter');

    // letters in the current stage
    var stage_letters = tr.cells[1].innerHTML.split(' ');
    var current = letters.filter(function(index, element) {
        return stage_letters.indexOf(element.innerHTML) > -1;
    });

    // letters in previous stages
    stage_letters = $.makeArray($(tr).prevAll().map(function() {
        return this.cells[1].innerHTML.split(' ');
    }));
    var previous = letters.filter(function(index, element) {
        return stage_letters.indexOf(element.innerHTML) > -1;
    });

    // show current and previous letters
    if (current.length > 0) current.removeClass('unselected-letter').addClass('current-letter');
    if (previous.length > 0) previous.removeClass('unselected-letter').addClass('previous-letter');
}

/**
 * Update the stage when the list of sight words changes
 * @param {HtmlElement} ta Text area
 */
function updateSightWords(ta) {
    var words = ta.value.trim().replace(/ ( )+/g, ' '); // remove consecutive spaces
    $('#stages-table tbody tr.selected td:nth-child(3)').html(words);
}

function addNewStage() {

    var tbody = $('#stages-table tbody');
    tbody.append('<tr class="linked"><td>' + (tbody.children().length + 1) + '</td><td></td><td></td></tr>');

    // click event for stage rows
    $('#stages-table tbody tr:last').click(function() {
        selectStage(this);
        displayLetters();
        selectLetters(this);
    });

    // go to the new stage
    $('#stages-table tbody tr:last').click();
}

function removeStage() {

    // remove the current stage
    var current_row = $('#stages-table tbody tr.selected');
    var current_stage = current_row.find("td").eq(0).html();
    current_row.remove();

    var rows = $('#stages-table tbody tr');

    if (rows.length > 0) {

        // renumber remaining stages
        renumberStages(rows);

        // select a different stage
        if (rows.length >= current_stage)
            $('#stages-table tbody tr:nth-child(' + current_stage + ')').click();
        else
            $('#stages-table tbody tr:nth-child(' + rows.length + ')').click();
    }
}

function renumberStages(rows) {

    var stageNum = 1;

    $.each(rows, function() {
        this.cells[0].innerHTML = stageNum++;
    });
}

function reorderStages() {

    var rows = $('#stages-table tbody tr');
    renumberStages(rows);

    var currentStage = $('#stages-table tbody tr.selected td:nth-child(1)').html();
    document.getElementById('setup-stage-number').innerHTML = currentStage;
    document.getElementById('remove-stage-number').innerHTML = currentStage;
}

function updateMatchingWords(wordsStr) {

    var words = JSON.parse(wordsStr);
    words = _.toArray(words);

    // add sight words
    _.each(sightWords, function(sw) {

        var word = _.find(words, function(w) {
            return w.Name === sw;
        });

        if (typeof word === 'undefined') {
            word = new DataWord(sw);
            word.html = '<span class="sight-word">' + sw + '</span>';
            words.push(word);
        }
    });

    // sort the list
    words = _.sortBy(words, function(w) { return w.Name; });

    var result = '';
    _.each(words, function(w) {

        if (!w.html)
            w.html = $.markupGraphemes(w.GPCForm, desiredGPCs);
        result += '<div class="word">' + w.html + '</div>';
    });

    // set the list
    $('#rs-matching-words').html(result);

    // make columns
    $.divsToColumns('word');

    // display the count
    document.getElementById('setup-words-count').innerHTML = words.length;
}

// event handlers
if (typeof ($) === "function") {

    $("#open-text-folder").click(function() {
        fireCSharpSetupEvent('openTextsFolderEvent', 'open');
        return false;
    });

    $("#setup-add-stage").click(function() {
        addNewStage();
        return false;
    });

    $("#define-sight-words").click(function() {
        alert('What are sight words?');
        return false;
    });

    $("#setup-stage-sight-words").blur(function() {
        updateSightWords(this);
    });

    $('#setup-remove-stage').click(function() {
        removeStage();
        return false;
    });
}

$(document).ready(function() {
    window.parent.postMessage('Texts', '*');
    $('#stages-table tbody').sortable({stop: reorderStages });
});