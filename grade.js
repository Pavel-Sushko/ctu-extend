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

const getElement = (type, lookupString) => {
	for (const e of document.querySelectorAll(`${type}`)) if (e.textContent.includes(lookupString)) return e;
};

const getPoints = (lookupString, child) => {
	const span = getElement('span', lookupString);

	let spanText = child ? span.querySelector('span').innerText : span.nextElementSibling.innerText;

	return Number(spanText.includes('N/A') ? '0' : spanText);
};

const getPercentage = (earnedPoints, maxPoints) => (earnedPoints / maxPoints) * 100;

const getLetterGrade = (percentage) => {
	for (const threshold of gradeThresholds) if (percentage >= threshold.threshold) return threshold.grade;
};

const getPointsToA = (earnedPoints, maxPoints) => {
	const pointsToA = maxPoints * (gradeThresholds[0].threshold / 100) - earnedPoints;

	return pointsToA < 0 ? 0 : pointsToA;
};

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

const maxPoints = getPoints('Total Points Possible in Course:');
let earnedPoints = getPoints('Points Earned to Date:', true);

const percentage = getPercentage(earnedPoints, maxPoints);
const grade = getLetterGrade(percentage);

appendGrade(earnedPoints, maxPoints);
