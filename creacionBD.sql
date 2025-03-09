-- DROP TABLE IF EXISTS PERTENECE CASCADE;
-- DROP TABLE IF EXISTS RESULTADO CASCADE;
-- DROP TABLE IF EXISTS NIVELES CASCADE;
-- DROP TABLE IF EXISTS AULA_INDIVIDUAL CASCADE;
-- DROP TABLE IF EXISTS AULA_VIRTUAL CASCADE;
-- DROP TABLE IF EXISTS SOLICITA CASCADE;
-- DROP TABLE IF EXISTS AULA CASCADE;
-- DROP TABLE IF EXISTS NINO CASCADE;
-- DROP TABLE IF EXISTS ADULTO CASCADE;
-- DROP TABLE IF EXISTS USUARIO CASCADE;

-- Crear tabla de USUARIOS
CREATE TABLE USUARIO (
    correo_usuario VARCHAR(255),
    nombre_usuario VARCHAR(255),
    contrasena VARCHAR(255),
    PRIMARY KEY (correo_usuario, nombre_usuario),
    tipo VARCHAR(50) CHECK (tipo IN ('adulto', 'nino'))
);

-- Crear tabla de ADULTOS
CREATE TABLE ADULTO (
    correo_usuario VARCHAR(255),
    nombre_usuario VARCHAR(255),
    PRIMARY KEY (correo_usuario, nombre_usuario),
    FOREIGN KEY (correo_usuario, nombre_usuario) REFERENCES USUARIO(correo_usuario, nombre_usuario)
);

-- Crear tabla de NIÑOS
CREATE TABLE NINO (
    correo_usuario VARCHAR(255),
    nombre_usuario VARCHAR(255),
    PRIMARY KEY (correo_usuario, nombre_usuario),
    FOREIGN KEY (correo_usuario, nombre_usuario) REFERENCES USUARIO(correo_usuario, nombre_usuario)
);

-- Crear tabla de AULAS
CREATE TABLE AULA (
    codigo_aula VARCHAR(50) PRIMARY KEY,
    nombre_aula VARCHAR(255)
);

-- Crear tabla de NIVELES
CREATE TABLE NIVELES (
    numero_nivel INT,
    codigo_aula VARCHAR(50),
    nombre_nivel VARCHAR(255),
    PRIMARY KEY (numero_nivel, codigo_aula),
    FOREIGN KEY (codigo_aula) REFERENCES AULA(codigo_aula)
);

-- Crear tabla de RESULTADOS
CREATE TABLE RESULTADO (
    correo_nino VARCHAR(255),
    nombre_nino VARCHAR(255),
    codigo_aula VARCHAR(50),
    numero_nivel INT,
    nota DECIMAL(5,2),
    PRIMARY KEY (correo_nino, nombre_nino, codigo_aula, numero_nivel),
    FOREIGN KEY (correo_nino, nombre_nino) REFERENCES NINO(correo_usuario, nombre_usuario),
    FOREIGN KEY (codigo_aula) REFERENCES AULA(codigo_aula),
    FOREIGN KEY (numero_nivel, codigo_aula) REFERENCES NIVELES(numero_nivel, codigo_aula)
);

-- Crear tabla de AULAS VIRTUALES
CREATE TABLE AULA_VIRTUAL (
    codigo_aula VARCHAR(50),
    correo_adulto VARCHAR(255),
    nombre_adulto VARCHAR(255),
    PRIMARY KEY (codigo_aula, correo_adulto, nombre_adulto),
    FOREIGN KEY (codigo_aula) REFERENCES AULA(codigo_aula),
    FOREIGN KEY (correo_adulto, nombre_adulto) REFERENCES ADULTO(correo_usuario, nombre_usuario)
);

-- Crear tabla de AULAS INDIVIDUALES
CREATE TABLE AULA_INDIVIDUAL (
    codigo_aula VARCHAR(50),
    correo_nino VARCHAR(255),
    nombre_nino VARCHAR(255),
    PRIMARY KEY (codigo_aula, correo_nino, nombre_nino),
    FOREIGN KEY (codigo_aula) REFERENCES AULA(codigo_aula),
    FOREIGN KEY (correo_nino, nombre_nino) REFERENCES NINO(correo_usuario, nombre_usuario)
);

-- Crear tabla de SOLICITUDES
CREATE TABLE SOLICITA (
    correo_nino VARCHAR(255),
    nombre_nino VARCHAR(255),
    codigo_aula VARCHAR(50),
    fecha_solicitud DATE,
    PRIMARY KEY (correo_nino, nombre_nino, codigo_aula),
    FOREIGN KEY (correo_nino, nombre_nino) REFERENCES NINO(correo_usuario, nombre_usuario),
    FOREIGN KEY (codigo_aula) REFERENCES AULA(codigo_aula)
);

-- Crear tabla de PERTENECE
CREATE TABLE PERTENECE (
    correo_nino VARCHAR(255),
    nombre_nino VARCHAR(255),
    codigo_aula VARCHAR(50),
    nivel_actual INT,
    PRIMARY KEY (correo_nino, nombre_nino, codigo_aula),
    FOREIGN KEY (correo_nino, nombre_nino) REFERENCES NINO(correo_usuario, nombre_usuario),
    FOREIGN KEY (codigo_aula) REFERENCES AULA(codigo_aula),
    FOREIGN KEY (nivel_actual, codigo_aula) REFERENCES NIVELES(numero_nivel, codigo_aula)
);
