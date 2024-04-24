// ==UserScript==
// @name         CTU Extend
// @namespace    https://psushko.com
// @homepage     https://github.com/Pavel-Sushko/ctu-extend
// @version      0.0.5
// @description  Extends the functionality of the CTU website
// @author       Pavel Sushko <github@psushko.com>
// @license      MIT
// @match        https://studentlogin.coloradotech.edu/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=coloradotech.edu
// @grant        GM_addElement
// @downloadURL  https://update.greasyfork.org/scripts/490426/CTU%20Extend.user.js
// @updateURL    https://update.greasyfork.org/scripts/490426/CTU%20Extend.meta.js
// ==/UserScript==

GM_addElement('script', {
	src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.js',
	type: 'text/javascript',
});

const PAGES = {
	gradebook: /^https?:\/\/studentlogin\.coloradotech\.edu\/\?.+#\/class\/\d+\/gradebook$/i,
	degreePlan: /^https?:\/\/studentlogin\.coloradotech\.edu\/\?.+#\/portal\/my-program\/degree-plan$/i,
};

// #region DOM Manipulation

/**
 * Get the first element that contains the lookup string
 *
 * @param {String} tag The tag to search for
 * @param {String} lookupString The string to search for
 * @returns {Element} The first element that contains the lookup string
 */
const getElement = (tag, lookupString) => {
	for (const element of document.querySelectorAll(tag))
		if (element.textContent.includes(lookupString)) return element;
};

// #endregion

// #region Page Handlers

/**
 * Handles the gradebook page
 */
const handleGradebook = async () => {
	const gradeThresholds = [
		{ grade: 'A', threshold: 94 },
		{ grade: 'A-', threshold: 90 },
		{ grade: 'B+', threshold: 86 },
		{ grade: 'B', threshold: 83 },
		{ grade: 'B-', threshold: 80 },
		{ grade: 'C+', threshold: 76 },
		{ grade: 'C', threshold: 73 },
		{ grade: 'C-', threshold: 70 },
		{ grade: 'D+', threshold: 65 },
		{ grade: 'D', threshold: 60 },
		{ grade: 'F', threshold: 0 },
	];

	// #region Grade Calculations

	/**
	 * Get the current absolute grade percentage
	 *
	 * @param {Number} earnedPoints
	 * @param {Number} maxPoints
	 * @returns {Number} The current absolute grade percentage
	 */
	const getPercentage = (earnedPoints, maxPoints) => (earnedPoints / maxPoints) * 100;

	/**
	 * Get the letter grade based on the percentage
	 *
	 * @param {Number} percentage
	 * @returns {String} The letter grade
	 */
	const getLetterGrade = (percentage) =>
		gradeThresholds.find(({ threshold }) => percentage >= threshold)?.grade || 'Grade not found';

	/**
	 * Get the points needed to get an A
	 *
	 * @param {Number} earnedPoints
	 * @param {Number} maxPoints
	 * @returns {Number} The points needed to get an A
	 */
	const getPointsToA = (earnedPoints, maxPoints) =>
		Math.max(0, maxPoints * (gradeThresholds[0].threshold / 100) - earnedPoints);

	// #endregion

	// #region Main

	/**
	 * Get the points from the lookup string
	 *
	 * @param {String} lookupString
	 * @param {Boolean} child
	 * @returns {Number} The points from the lookup string
	 */
	const getPoints = async (lookupString, child) => {
		let span = getElement('span', lookupString);

		while (!span) {
			await new Promise((r) => setTimeout(r, 100));

			span = getElement('span', lookupString);
		}

		let spanText = child ? span.querySelector('span').innerText : span.nextElementSibling.innerText;

		return Number(spanText.includes('N/A') ? '0' : spanText);
	};

	// #endregion

	/**
	 * Append the grade to the page
	 *
	 * @param {Number} earnedPoints
	 * @param {Number} maxPoints
	 */
	const appendGrade = (earnedPoints, maxPoints) => {
		const grade = getLetterGrade(getPercentage(earnedPoints, maxPoints));

		// Get the parent element only once to avoid querying the DOM multiple times
		const gradeDiv = getElement('strong', 'Current Course Grade:').parentElement;
		const absoluteGradeDiv = gradeDiv.cloneNode(true); // Clone for the absolute grade

		// Use a single querySelector and template literals for cleaner code
		absoluteGradeDiv.querySelector('strong').innerText = 'Absolute Course Grade:';
		absoluteGradeDiv.querySelector('span').innerText = `${grade} (${getPointsToA(earnedPoints, maxPoints).toFixed(
			2
		)} points to A)`;

		// Optimize updating innerHTML by doing it in one operation
		const bottomDiv = absoluteGradeDiv.querySelector('div');
		bottomDiv.innerHTML = bottomDiv.innerHTML
			.replace(/\/\s[^<]+/, `/ ${maxPoints} `) // Update max points
			.replace(' to Date', ''); // Remove "to Date" text

		gradeDiv.after(absoluteGradeDiv);
	};

	let earnedPoints = await getPoints('Points Earned to Date:', true);
	let maxPoints = await getPoints('Total Points Possible in Course:');

	appendGrade(earnedPoints, maxPoints);
};

/**
 * Handles the degree plan page
 */
const handleDegreePlan = async () => {
	const SELECTORS = {
		earnedCredit: '.credit-item-title',
		requiredCredit: '.credits-required',
	};

	let creditsEarnedElement = document.querySelector(SELECTORS.earnedCredit);
	let creditsRequiredElement = document.querySelector(SELECTORS.requiredCredit);

	while (!creditsEarnedElement || !creditsRequiredElement) {
		await new Promise((r) => setTimeout(r, 100));

		creditsEarnedElement = document.querySelector(SELECTORS.earnedCredit);
		creditsRequiredElement = document.querySelector(SELECTORS.requiredCredit);
	}

	const result = math.evaluate(creditsEarnedElement.innerText + creditsRequiredElement.innerText) * 100;

	let creditsSpan = getElement('span', 'Credits Earned');

	while (!creditsSpan) {
		await new Promise((r) => setTimeout(r, 100));

		creditsSpan = getElement('span', 'Credits Earned');
	}

	creditsSpan.innerHTML += ` (${result.toFixed(2)}%)`;
};

/**
 * Handles the pages
 */
const handlePages = async () => {
	let prevPage = '';

	while (true) {
		if (prevPage !== window.location.href)
			switch (true) {
				case PAGES.gradebook.test(window.location.href):
					await handleGradebook();
					break;
				case PAGES.degreePlan.test(window.location.href):
					await handleDegreePlan();
					break;
				default:
					break;
			}

		prevPage = window.location.href;

		await new Promise((r) => setTimeout(r, 100));
	}
};

// #endregion

(async function () {
	handlePages();
})();
