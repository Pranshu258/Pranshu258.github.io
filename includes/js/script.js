/*Custom Javascript File////////////////////////////////////////////////////////*/
/*Author: Pranshu Gupta*/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//This will add the smooth scrolling feature
$(function() {
  // This will select everything with the class smoothScroll
  // This should prevent problems with carousel, scrollspy, etc...
  $('.smoothScroll').click(function() {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 500); // The number here represents the speed of the scroll in milliseconds
        return false;
      }
    }
  });

  $('#proj1').slideUp();
  $('#proj1toggle').bind('click', function() {
    $('#proj1').slideDown();
    var target = $('#proj1');
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html,body').animate({
        scrollTop: target.offset().top - 20
      }, 500); // The number here represents the speed of the scroll in milliseconds
      return false;
    }     
  });

  $('#proj2').slideUp();
  $('#proj2toggle').bind('click', function() {
    $('#proj2').slideDown();
    var target = $('#proj2');
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html,body').animate({
        scrollTop: target.offset().top - 20
      }, 500); // The number here represents the speed of the scroll in milliseconds
      return false;
    }     
  });

  $('#proj3').slideUp();
  $('#proj3toggle').bind('click', function() {
    $('#proj3').slideDown();
    var target = $('#proj3');
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html,body').animate({
        scrollTop: target.offset().top - 20
      }, 500); // The number here represents the speed of the scroll in milliseconds
      return false;
    }
  });

  $('#proj1close').bind('click', function() {
    $('#proj1').slideUp();
    var target = $('#projects');
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html,body').animate({
        scrollTop: target.offset().top - 20
      }, 500); // The number here represents the speed of the scroll in milliseconds
      return false;
    }
  });
  $('#proj2close').bind('click', function() {
    $('#proj2').slideUp();
    var target = $('#projects');
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html,body').animate({
        scrollTop: target.offset().top - 20
      }, 500); // The number here represents the speed of the scroll in milliseconds
      return false;
    }
  });
  $('#proj3close').bind('click', function() {
    $('#proj3').slideUp();
    var target = $('#projects');
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html,body').animate({
        scrollTop: target.offset().top - 20
      }, 500); // The number here represents the speed of the scroll in milliseconds
      return false;
    }
  });

});

//The navigation bar animation on scroll
var lastScrollTop = 0;
var navbar = $('#nav');
$(window).scroll(function(event){
   var st = $(this).scrollTop();
   if (st > lastScrollTop){
   		//Scroll down
       	navbar.css('padding', '8px');
   } else {
   		//Scroll up
      	navbar.css('padding', '15px');
   }
   lastScrollTop = st;
});

//This function will add smoothScroll to the projects section