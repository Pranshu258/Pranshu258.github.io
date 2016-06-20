(function () {
	'use strict';

	portfolio.controller("mypagesController", ['$scope', mypagesController])

	function mypagesController($scope) {
		$scope.state = "mypages"
		$scope.pages = [
			{
				"title": "INSTALLING LINUX PACKAGES",
				"category": "Linux",
				"details": "Get the all in one shell script to install linux packages, tested on Ubuntu 16.04 LTS :)",
				"url": "more/linux_package_install.html"
			},
			{
				"title": "LEARNING MANIFOLDS IN ROBOT MOTION",
				"category": "Machine Learning",
				"url": "more/robot_motion.html",
				"details": "Learning the structure of space for a mobile robot, based on observations (i.e. images from the robot's camera) and nothing else with the help of the ISOMAP algorithm"
			},
			{
				"title": "IMPROVING EMACS DOCTOR",
				"category": "Artificial Intelligence",
				"url": "more/doctor.html",
				"details": "An improved version of the 'emacs doctor'. A few more functionalities have been added to the original version that was distributed with 'Emacs 24.5'."
			}
		]
	}

}());