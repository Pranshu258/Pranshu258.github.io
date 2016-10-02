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
          scrollTop: target.offset().top - 20
        }, 500); // The number here represents the speed of the scroll in milliseconds
        return false;
      }
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
       	navbar.css('padding', '4px');
   } else {
   		//Scroll up
      	navbar.css('padding', '15px');
   }
   lastScrollTop = st;
});

//This function will add smoothScroll to the projects section