(function () {
	'use strict';

	portfolio.controller("mainController", ['$scope', mainController])

	function mainController($scope) {
		$scope.state = "main"
		$scope.navList = ["Home", "Projects", "Creative", "Education", "Contact"]
		$scope.showNav = function () {

		}
	}

}());