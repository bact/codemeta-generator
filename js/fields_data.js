/**
 * Copyright (C) 2019  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

"use strict";

var SPDX_LICENSES = null;
var SPDX_LICENSE_IDS = null;

const loadSpdxData = async () => {
    const licensesResponse = await fetch("./data/spdx/licenses.json");
    const licenseList = await licensesResponse.json();
    return licenseList.licenses;
}

function initSpdx() {
    var datalist = document.getElementById('licenses');

    SPDX_LICENSES.forEach(function (license) {
        var option = document.createElement('option');
        option.value = license['licenseId'];
        option.label = `${license['licenseId']}: ${license['name']}`;
        datalist.appendChild(option);
    });

}

function insertLicenseElement(licenseId) {
    let selectedLicenses = document.getElementById("selected-licenses");
    let newLicense = document.createElement("div");
    newLicense.className = "selected-license";
    newLicense.innerHTML = `
        <span class="license-id">${licenseId}</span>
        <button type="button" class="remove-license" onclick="removeLicense(this)">Remove</button>
        `;

    selectedLicenses.appendChild(newLicense);
    return newLicense;
}

function validateLicense(e) {
    // If license is empty or SPDX_LICENSE_IDS is not loaded yet, do nothing
    var licenseField = document.getElementById('license');
    var license = licenseField.value.trim();
    if (!license || !SPDX_LICENSE_IDS || SPDX_LICENSE_IDS.length <= 0) {
        return;
    }

    // Continue only if Enter/Tab key is pressed
    if (e.key && e.key !== "Enter" && e.keyCode !== "Tab") {
        return;
    }
    // Note: For some reason e.keyCode is undefined when Enter/Tab key is pressed.
    // Maybe it's because of the datalist. But the above condition should
    // work in either case.

    // Find a case-insensitive match in the SPDX License List
    const normalizedLicenseValue = license.toLowerCase();
    const match = SPDX_LICENSE_IDS.find(id =>
        id.toLowerCase() === normalizedLicenseValue);
    if (!match) {
        licenseField.setCustomValidity('Unknown license id');
    }
    else {
        licenseField.setCustomValidity('');
        license = match; // Use the correctly cased value

        // Add the license if it's not already added
        let selectedLicenses = document.getElementById("selected-licenses");
        let duplicated = Array.from(selectedLicenses.getElementsByClassName("license-id"))
            .some(el => el.textContent === license);
        if (duplicated) {
            licenseField.value = "";
        }
        else {
            insertLicenseElement(license);
            licenseField.value = "";
            generateCodemeta();
        }
    }
}

function removeLicense(btn) {
    btn.parentElement.remove();
    generateCodemeta();
}

function initFields() {
    initSpdx();
}
