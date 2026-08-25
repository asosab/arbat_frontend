/** Buddy User — formulario completo del perfil universal. */
window.BuddyUserViews = window.BuddyUserViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-user-view-styles')) return;
    var style=document.createElement('style');style.id='buddy-user-view-styles';
    style.textContent='.buddy-user-view{font:inherit;display:grid;gap:16px;max-width:760px}.buddy-user-view section{border:1px solid #ddd;border-radius:12px;padding:16px}.buddy-user-view form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.buddy-user-view label{display:grid;gap:6px}.buddy-user-view input,.buddy-user-view select,.buddy-user-view textarea,.buddy-user-view button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}.buddy-user-view textarea{min-height:90px;resize:vertical}.buddy-user-view .wide{grid-column:1/-1}.buddy-user-view .actions{grid-column:1/-1;display:flex;gap:8px;align-items:center}.buddy-user-view .status{grid-column:1/-1;min-height:1.3em}.buddy-user-photo{display:flex;gap:12px;align-items:center}.buddy-user-view .hint{opacity:.75;font-size:.92em}';
    document.head.appendChild(style);
  }
  window.BuddyUserViews.profile=function(context){
    ensureStyles();
    var target=context.target,user=context.user||{},api=context.api,config=context.config||{};target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-user-view';
    var title=document.createElement('h2');title.textContent='Mi perfil';root.appendChild(title);
    var intro=document.createElement('p');intro.className='hint';intro.textContent='Estos datos pertenecen a tu cuenta universal de Buddy y pueden ser utilizados por los sitios donde tengas una relación activa.';root.appendChild(intro);

    var identity=document.createElement('section');var ih=document.createElement('h3');ih.textContent='Identidad y contacto';identity.appendChild(ih);
    var form=document.createElement('form');
    function add(labelText,name,value,type,required,readonly){
      var l=document.createElement('label');l.textContent=labelText;var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;if(required)i.required=true;if(readonly)i.readOnly=true;l.appendChild(i);form.appendChild(l);return i;
    }
    add('Nombre','firstName',user.firstName||'','text',false,false);
    add('Apellido','lastName',user.lastName||'','text',false,false);
    add('Nombre para mostrar','name',user.name||'','text',true,false);
    add('Correo electrónico','email',user.email||'','email',true,true);
    add('Número celular que usa en WhatsApp','phone',user.phone||'','tel',true,false);
    if(!config.fields||config.fields.locale!==false){
      var l=document.createElement('label');l.textContent='Idioma';var s=document.createElement('select');s.name='locale';
      (config.locales||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value;x.textContent=o.label;x.selected=o.value===user.locale;s.appendChild(x);});l.appendChild(s);form.appendChild(l);
    }
    var actions=document.createElement('div');actions.className='actions';var status=document.createElement('div');status.className='status';var save=document.createElement('button');save.type='submit';save.textContent='Guardar cambios';actions.appendChild(save);form.appendChild(status);form.appendChild(actions);
    form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;status.textContent='Guardando…';var data={};Array.prototype.forEach.call(form.elements,function(el){if(el.name)data[el.name]=el.value;});api.updateProfile(data).then(function(){status.textContent='Cambios guardados.';}).catch(function(err){status.textContent=err.message;}).finally(function(){save.disabled=false;});});
    identity.appendChild(form);root.appendChild(identity);

    var photoSection=document.createElement('section');var ph=document.createElement('h3');ph.textContent='Foto de perfil';photoSection.appendChild(ph);
    var photo=document.createElement('div');photo.className='buddy-user-photo';photo.appendChild(api.avatar(user,'buddy-user-avatar'));
    var file=document.createElement('input');file.type='file';file.accept='image/*';file.addEventListener('change',function(){if(!file.files[0])return;api.uploadPhoto(file.files[0]).then(function(){return api.getCurrent();}).then(function(){return api.render({target:target,view:'profile'});}).catch(function(err){photoStatus.textContent=err.message;});});
    photo.appendChild(file);var photoStatus=document.createElement('span');photoStatus.className='hint';photo.appendChild(photoStatus);photoSection.appendChild(photo);root.appendChild(photoSection);
    target.appendChild(root);return root;
  };
})(window, document);
