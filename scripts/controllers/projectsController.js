(function () {
	'use strict';

	portfolio.controller("projectsController", ['$scope', projectsController])

	function projectsController($scope) {
		$scope.state = "projects"
		$scope.projects = [
			{
				"title": "CROWD BEHAVIOR ANALYSIS BASED ON TRAJECTORIES",
				"category": "Artificial Intelligence and Data Mining",
				"details": "Crowd behavior analysis is an important field of research in modern world. It has wide applications in surveillance and public safety which are one of the prime social concerns. One way to analyze crowd behavior is obtain crowd movement data and then find out outliers in the individual trajectories to infer any abnormal behavior in the crowd. Implemented a system that takes a set of trajectories obtained from crowd data and detects the outliers in that set. A trajectory is a sequence of points (x,y,t), where x, y are the ground co-ordinates of the person at time t.",
				"url": "https://github.com/Pranshu258/cba"
			},
			{
				"title": "PyCS: A COMPILER FOR C# IN PYTHON",
				"category": "Compiler Design",
				"details": "An end to end compiler for C# implemented in Python3 using the PLY module. It takes a C# source file as input and compiles it to x86(IA32) code which can be run on a linux machine using the gnu assembler.",
				"url": "https://github.com/divush/csharp-compiler"
			},
			{
				"title": "GREENDZINE TECHNOLOGIES WEBSITE",
				"category": "Web Design and Development",
				"details": "Greendzine Technologies is a company striving to develop products that are based on green technology at affordable prices for the community as well as businesses. A pioneer in electric mobility solutions in India, the company aims to bring a greener future in India. Built a digital platform which beautifully reflects the brand and provides information about the products and services provided by the company. Focussing on customer satisfaction and quality of service, customer/product registration complaint management systems were also developed as integral parts of the website.",
				"url": "http://www.greendzine.in/"
			},
			{
				"title": "WAREHOUSE ORDER PICKING",
				"category": "Algorithms and Data Analysis",
				"details": "The order picking process is the process of retrieving products from specified storage locations on the basis of customer orders. It is in general one of the most time consuming processes in warehouses and contributes for a large extent to warehousing costs. We can reduce this cost by determining optimal order picking routes. This consists of finding a sequence in which products have to be retrieved from storage such that travel distances are as short as possible. Designed and implemented a heuristic algorithm for finding warehouse order picking paths. Also implemented a simulator that can be used to test, analyse and improve any order picking algorithm meant to be used for rectangular warehouses with similar constraints.",
				"url": "http://www.greendzine.in/analytics.php"
			},
			{
				"title": "RENJU GAME",
				"category": "Python Application Development with Pygame",
				"details": "RENJU is a strategy board game played by two people. One of them takes the black stone and the other one white. They place their stones by turns on the board. The player who first makes five stones (of his/her colour) in a line wins the game. The line can be in any direction, horizontal, vertical or any of the two diagonals. Developed an application that allows the user to play RENJU against the computer. Used MINIMAX and ALPHA-BETA PRUNING algorithms to implement the computer player.",
				"url": "https://github.com/Pranshu258/Renju"
			}
		]

	}

}());