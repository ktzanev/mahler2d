// -------------------------------------------------
// try to put approximatively the Santaló point at zero
// with at most maxiter^2 iterates
function santalo2zero (poly,maxiter){

  atzero(poly,centroid(poly));
  var dp = dualPolygon(poly);
  var dv = volume(dp);
  for (var i = 0; i < maxiter; i++) {
    console.log("Now the dual volume is :"+dv);
    var mv = centroid(dp);
    for(var j=0; j < maxiter; j++) {
      var tempp = poly.slice(0); // copy the polygone
      translate(tempp,mv);
      var tempdp = dualPolygon(tempp);
      var tempdv = volume(tempdp);
      console.log("Try with:"+tempdv);
      if(tempdv < dv)
        break;
      else
        mv = [mv[0]/2,mv[1]/2];
    }
    if(tempdv > dv)
      break;
    // copy tmpp => poly by keeping the poly reference
    for (var k = 0; k < poly.length; k++) {
      poly[k] = tempp[k];
    };
    dp = tempdp;
    dv = tempdv;
  };
  console.log("Finaly the dual volume is :"+dv);
}
