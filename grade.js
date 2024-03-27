// ==UserScript==
// @name         CTU Extender
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  Calculate the current absolute grade and points needed to get an A in CTU courses
// @author       Pavel Sushko <github@psushko.com>
// @license      MIT
// @match        https://studentlogin.coloradotech.edu/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=coloradotech.edu
// @grant        none
// @downloadURL  https://update.greasyfork.org/scripts/490426/CTU%20Grade%20Calculator.user.js
// @updateURL    https://update.greasyfork.org/scripts/490426/CTU%20Grade%20Calculator.meta.js
// ==/UserScript==

(async function () {
	let prevPage = '';

	while (true) {
		if (prevPage !== window.location.href)
			if (
				/^https?:\/\/studentlogin\.coloradotech\.edu\/\?.+#\/class\/\d+\/gradebook$/i.test(window.location.href)
			) {
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
					absoluteGradeDiv.querySelector('span').innerText = `${grade} (${getPointsToA(
						earnedPoints,
						maxPoints
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
			}

		prevPage = window.location.href;

		await new Promise((r) => setTimeout(r, 100));
	}
})();
