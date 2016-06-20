'use strict';

var portfolio = angular.module("portfolio", ['ngRoute', 'ngAnimate']);

portfolio.config(function ($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: 'homeController'
        })
        .when('/Home', {
            templateUrl: 'pages/home.html',
            controller: 'homeController'
        })
        .when('/Projects', {
            templateUrl: 'pages/projects.html',
            controller: 'projectsController'
        })
        .when('/Creative', {
            templateUrl: 'pages/creative.html',
            controller: 'creativeController'
        })
        .when('/Pages', {
            templateUrl: 'pages/pages.html',
            controller: 'mypagesController'
        })
        .when('/Contact', {
            templateUrl: 'pages/contact.html',
            controller: 'contactController'
        })
});