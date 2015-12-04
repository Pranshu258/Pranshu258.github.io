/*Custom Javascript File////////////////////////////////////////////////////////*/
/*Author: Pranshu Gupta*/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
$(
	function() {
		var body = $('body');
		if (Modernizr.mq('(max-width: 767px)')) {
		    body.addClass('menu');		    
		}
		$('.menu-toggle').bind('click', function() {
			body.toggleClass('menu-open');
			return true;
		});
})
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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