<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        <div class="login-brand">
            <span class="brand-micro">Micro</span><span class="brand-links">Links</span>
        </div>
        <p class="login-subtitle">Portail d'authentification inter-institutionnel</p>
    <#elseif section = "form">
        <div class="login-box">
            <#if message??>
                <div class="alert alert-${message.type}">
                    <span class="alert-icon">
                        <#if message.type = 'error'>⚠️
                        <#elseif message.type = 'success'>✅
                        <#else>ℹ️
                        </#if>
                    </span>
                    <span class="alert-text">${message.summary}</span>
                </div>
            </#if>

            <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post" class="login-form">
                <div class="form-group">
                    <label for="username">Identifiant ou Adresse Email</label>
                    <input id="username" class="form-control" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off" placeholder="Saisissez votre identifiant" required />
                </div>

                <div class="form-group">
                    <div class="label-wrapper">
                        <label for="password">Mot de passe</label>
                        <#if realm.resetPasswordAllowed>
                            <a href="${url.loginResetCredentialsUrl}" class="forgot-password-link">Mot de passe oublié ?</a>
                        </#if>
                    </div>
                    <input id="password" class="form-control" name="password" type="password" autocomplete="off" placeholder="••••••••" required />
                </div>

                <#if realm.rememberMe && !usernameAttachment??>
                    <div class="form-group remember-me-group">
                        <input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if> />
                        <label for="rememberMe">Se souvenir de moi</label>
                    </div>
                </#if>

                <button class="btn btn-primary btn-block" name="login" id="kc-login" type="submit">
                    Se connecter
                </button>
            </form>
        </div>
    </#if>
</@layout.registrationLayout>
