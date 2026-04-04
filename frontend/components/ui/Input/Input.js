import styles from './Input.module.css';

export default function Input ({type = 'text',placeholder,className = '',id,name,value,onChange}){
    return(
        <input type={type} placeholder={placeholder} className={`${styles.input} ${className}`} id={id} name={name}
            value={value} onChange={onChange}
        />
        
    )
}