/**
 * Copyright (C) 2019-2025  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

"use strict";

// List of all HTML fields in a Person fieldset.
const personFields = [
    'givenName',
    'familyName',
    'email',
    'id',
    'affiliation',
];

// Helper to attach a click handler to a control inside a person fieldset.
function attachPersonControl(personPrefix, suffix, handler) {
    const sel = `#${personPrefix}_${suffix}`;
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener('click', (evt) => {
        const fs = evt.target.closest('fieldset.person');
        if (!fs) return;
        const curId = parseInt(fs.id.split('_').pop(), 10);
        handler(fs, curId);
    });
}

function createPersonFieldset(personPrefix, legend) {
    // Creates a fieldset containing inputs for informations about a person
    var fieldset = document.createElement("fieldset")
    var moveButtons;
    fieldset.classList.add("person");
    fieldset.classList.add("leafFieldset");
    fieldset.id = personPrefix;

    fieldset.innerHTML = `
        <legend>${legend}</legend>
        <div class="moveButtons">
            <input type="button" id="${personPrefix}_moveToLeft" value="<" class="moveToLeft"
                title="Moves this person to the left." />
            <input type="button" id="${personPrefix}_remove" value="X" title="Remove this person" />
            <input type="button" id="${personPrefix}_moveToRight" value=">" class="moveToRight"
                title="Moves this person to the right." />
        </div>
        <p>
            <label for="${personPrefix}_givenName">Given name</label>
            <input type="text" id="${personPrefix}_givenName" name="${personPrefix}_givenName"
                placeholder="Jane" required="true" />
        </p>
        <p>
            <label for="${personPrefix}_familyName">Family name</label>
            <input type="text" id="${personPrefix}_familyName" name="${personPrefix}_familyName"
                placeholder="Doe" />
        </p>
        <p>
            <label for="${personPrefix}_email">E-mail address</label>
            <input type="email" id="${personPrefix}_email" name="${personPrefix}_email"
                placeholder="jane.doe@example.org" />
        </p>
        <p>
            <label for="${personPrefix}_id">URI</label>
            <input type="url" id="${personPrefix}_id" name="${personPrefix}_id"
                placeholder="http://orcid.org/0000-0002-1825-0097" />
        </p>
        <p>
        <label for="${personPrefix}_affiliation">Affiliation</label>
            <input type="text" id="${personPrefix}_affiliation" name="${personPrefix}_affiliation"
                placeholder="Department of Computer Science, University of Pisa" />
        </p>
        <input type="hidden" id="${personPrefix}_role_index" value="0" />
        <input type="button" id="${personPrefix}_role_add" value="Add one role" />
    `;

    return fieldset;
}

function addPersonWithId(container, prefix, legend, id) {
    var personPrefix = `${prefix}_${id}`;
    var fieldset = createPersonFieldset(personPrefix, `${legend} #${id}`);

    container.appendChild(fieldset);

    // Attach event listener to the control using an ID at click time,
    // as the ID will change when persons are removed.
    // fs = fieldset, curId = current person ID (1-based)
    attachPersonControl(personPrefix, 'moveToLeft', (fs, curId) => movePerson(prefix, curId, 'left'));
    attachPersonControl(personPrefix, 'moveToRight', (fs, curId) => movePerson(prefix, curId, 'right'));
    attachPersonControl(personPrefix, 'role_add', (fs) => addRole(fs.id));
    attachPersonControl(personPrefix, 'remove', (fs, curId) => removePersonAt(prefix, curId));
}

function movePerson(prefix, id1, direction) {
    var nbPersons = getNbPersons(prefix);
    var id2;

    // Computer id2, the id of the person to flip id1 with (wraps around the
    // end of the list of persons)
    if (direction == "left") {
        id2 = id1 - 1;
        if (id2 <= 0) {
            id2 = nbPersons;
        }
    }
    else {
        id2 = id1 + 1;
        if (id2 > nbPersons) {
            id2 = 1;
        }
    }

    // Flip the field values, one by one
    personFields.forEach((fieldName) => {
        var field1 = document.querySelector(`#${prefix}_${id1}_${fieldName}`);
        var field2 = document.querySelector(`#${prefix}_${id2}_${fieldName}`);
        var value1 = field1.value;
        var value2 = field2.value;
        field2.value = value1;
        field1.value = value2;
    });

    // Form was changed; regenerate
    generateCodemeta();
}

function addPerson(prefix, legend) {
    var container = document.querySelector(`#${prefix}_container`);
    var personId = getNbPersons(prefix) + 1;

    addPersonWithId(container, prefix, legend, personId);

    setNbPersons(prefix, personId);

    return personId;
}

function removePerson(prefix) {
    var personId = getNbPersons(prefix);

    document.querySelector(`#${prefix}_${personId}`).remove();

    setNbPersons(prefix, personId - 1);
}

function removePersonAt(prefix, id) {
    var nb = getNbPersons(prefix);
    if (id < 1 || id > nb) return;

    var node = document.querySelector(`#${prefix}_${id}`);
    if (node) node.remove();

    // Shift following persons' ids and element ids/names
    for (var i = id + 1; i <= nb; i++) {
        var from = document.querySelector(`#${prefix}_${i}`);
        if (!from) continue;
        var toId = i - 1;
        from.id = `${prefix}_${toId}`;

        // Update the legend text (e.g. "Author #3" -> "Author #2")
        var legendEl = from.querySelector('legend');
        if (legendEl) {
            legendEl.textContent = legendEl.textContent.replace(/#\d+$/, `#${toId}`);
        }

        // Update child input/label ids and names
        var nodes = from.querySelectorAll('[id], label[for]');
        nodes.forEach((el) => {
            if (el.id) {
                var oldId = el.id;
                var newId = oldId.replace(`_${i}_`, `_${toId}_`).replace(`_${i}`, `_${toId}`);
                el.id = newId;
                if (el.name) {
                    el.name = el.name.replace(`_${i}_`, `_${toId}_`).replace(`_${i}`, `_${toId}`);
                }
            }
            if (el.getAttribute && el.getAttribute('for')) {
                var oldFor = el.getAttribute('for');
                var newFor = oldFor.replace(`_${i}_`, `_${toId}_`).replace(`_${i}`, `_${toId}`);
                el.setAttribute('for', newFor);
            }
        });
    }

    setNbPersons(prefix, nb - 1);
    // Form was changed; regenerate
    generateCodemeta();
}

// Initialize a group of persons (authors, contributors) on page load.
// Useful if the page is reloaded.
function initPersons(prefix, legend) {
    var nbPersons = getNbPersons(prefix);
    var personContainer = document.querySelector(`#${prefix}_container`)

    for (let personId = 1; personId <= nbPersons; personId++) {
        addPersonWithId(personContainer, prefix, legend, personId);
    }
}

function removePersons(prefix) {
    var nbPersons = getNbPersons(prefix);
    var personContainer = document.querySelector(`#${prefix}_container`)

    for (let personId = 1; personId <= nbPersons; personId++) {
        removePerson(prefix)
    }
}

function addRole(personPrefix) {
    const roleButtonGroup = document.querySelector(`#${personPrefix}_role_add`);
    const roleIndexNode = document.querySelector(`#${personPrefix}_role_index`);
    const roleIndex = parseInt(roleIndexNode.value, 10);

    const ul = document.createElement("ul")
    ul.classList.add("role");
    ul.id = `${personPrefix}_role_${roleIndex}`;

    ul.innerHTML = `
        <li><label for="${personPrefix}_roleName_${roleIndex}">Role</label>
            <input type="text" class="roleName" id="${personPrefix}_roleName_${roleIndex}" name="${personPrefix}_roleName_${roleIndex}"
                placeholder="Developer" size="10" /></li>
        <li><label for="${personPrefix}_startDate_${roleIndex}">Start date:</label>
            <input type="date" class="startDate" id="${personPrefix}_startDate_${roleIndex}" name="${personPrefix}_startDate_${roleIndex}" /></li>
        <li><label for="${personPrefix}_endDate_${roleIndex}">End date:</label>
            <input type="date" class="endDate" id="${personPrefix}_endDate_${roleIndex}" name="${personPrefix}_endDate_${roleIndex}" /></li>
        <li><input type="button" id="${personPrefix}_role_remove_${roleIndex}" value="X" title="Remove role" /></li>
    `;
    roleButtonGroup.after(ul);

    document.querySelector(`#${personPrefix}_role_remove_${roleIndex}`)
        .addEventListener('click', () => removeRole(personPrefix, roleIndex));

    roleIndexNode.value = roleIndex + 1;

    return roleIndex;
}

function removeRole(personPrefix, roleIndex) {
    document.querySelector(`#${personPrefix}_role_${roleIndex}`).remove();
}

function resetForm() {
    removePersons('author');
    removePersons('contributor');
    // Reset the list of selected licenses
    document.getElementById("selected-licenses").innerHTML = '';

    // Reset the form after deleting elements, so nbPersons doesn't get
    // reset before it's read.
    document.querySelector('#inputForm').reset();
}

function fieldToLower(event) {
    event.target.value = event.target.value.toLowerCase();
}

function initCallbacks() {
    // To make sure the selection of a license from the datalist
    // works more predictably across browsers, we listen to
    // 'input', 'change', and 'keydown' events for the license field.
    // This should work with Firefox, Safari, and Chrome-based browsers.

    // In Firefox datalist selection without Enter press does not trigger
    // 'change' event, so we need to listen to 'input' event to catch
    // a selection with mouse click.
    document.querySelector('#license')
        .addEventListener('input', validateLicense);
    document.querySelector('#license')
        .addEventListener('change', validateLicense);
    // Safari needs 'keydown' to catch Enter press when datalist is shown
    document.querySelector('#license')
        .addEventListener('keydown', validateLicense);

    document.querySelector('#generateCodemetaV2').disabled = false;
    document.querySelector('#generateCodemetaV2')
        .addEventListener('click', () => generateCodemeta("2.0"));

    document.querySelector('#generateCodemetaV3').disabled = false;
    document.querySelector('#generateCodemetaV3')
        .addEventListener('click', () => generateCodemeta("3.0"));

    document.querySelector('#resetForm')
        .addEventListener('click', resetForm);

    document.querySelector('#validateCodemeta').disabled = false;
    document.querySelector('#validateCodemeta')
        .addEventListener('click', () => parseAndValidateCodemeta(true));

    document.querySelector('#importCodemeta').disabled = false;
    document.querySelector('#importCodemeta')
        .addEventListener('click', importCodemeta);

    document.querySelector('#downloadCodemeta input').disabled = false;
    document.querySelector('#downloadCodemeta input')
        .addEventListener('click', downloadCodemeta);

    document.querySelector('#inputForm')
        .addEventListener('change', () => generateCodemeta());

    document.querySelector('#developmentStatus')
        .addEventListener('change', fieldToLower);

    initPersons('author', 'Author');
    initPersons('contributor', 'Contributor');
}
